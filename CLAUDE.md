# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ChorePal is a mobile app (React Native + Expo Router) that lets parents assign household chores to children, with AI-assisted photo verification (AWS Rekognition) and a points-based "virtual wallet" reward system.

## Repository layout

- `Application/Frontend/` — the Expo app (all client code lives here; this is where you `cd` to run anything)
- `Application/Backend/` — Supabase project: `Database/schema.sql` (hand-maintained snapshot of the live schema), `supabase/migrations/`, `supabase/functions/` (edge functions)
- `Application/AI/rekognition-logic.ts` — standalone reference copy of the Rekognition call; the actual deployed logic lives in `Application/Backend/supabase/functions/verify-with-ai/index.ts`

## Commands

Run from `Application/Frontend/`:
- `npm install` — install dependencies
- `npx expo start` — start the dev server (press `w` for web, or scan the QR with Expo Go for a device)
- `npx expo start --web` / `--ios` / `--android` — start directly on one platform
- `npx tsc --noEmit` — type-check (not wired as an npm script; run directly)
- `npm run lint` — `expo lint`

There is no automated test suite — `Testing/` and `Documentation/` at the repo root are empty placeholders. Testing is manual (see README's checkpoints: auth flows for both roles, the `secret_code` parent-child linking, the AI capture pipeline on the child dashboard, S3 upload).

Supabase (run from `Application/Backend/`, requires the Supabase CLI and project link):
- `supabase db push` — apply migrations in `supabase/migrations/`
- `supabase functions deploy get-upload-url` / `verify-with-ai` — deploy an edge function

## Architecture

### Routing and screen structure (Expo Router)

`app/_layout.tsx` is the root `Stack`. It loads the Fredoka/Nunito fonts (`useFonts`, holding the splash screen until ready) and applies the shared `screen` style token (background + top/side margins, see below) via `contentStyle` — except for the `(parent)` and `(child)` route groups, which reset `contentStyle` to `{flex:1}` because they're Tabs navigators: applying the padding at the Stack level would inset the floating tab bar itself. Instead, `(parent)/_layout.tsx` and `(child)/_layout.tsx` apply the same `screen` token per-screen via `sceneStyle` on `<Tabs>`.

Auth/onboarding flow (top-level, outside the tab groups): `index.tsx` (splash — checks session, routes by role) → `login-page.tsx` / `signup-page.tsx` → `join-household.tsx` (enter/display the household's `secret_code`) → into `(parent)/home` or `(child)/home`.

`(parent)/` and `(child)/` are parallel route groups with matching shapes (`home`, `account`, `rewards`, `chores/index`, `chores/[id]`), each with its own `_layout.tsx` defining a custom floating pill-shaped bottom tab bar. `(parent)` additionally has `chores/create-chore`. Screens registered with `options={{ href: null }}` (e.g. `chores/[id]`, `chores/create-chore`) are reachable by navigation but hidden from the tab bar — they still belong to that Tabs navigator and inherit its `sceneStyle`.

Several screen files are `// @ts-nocheck` (pre-existing, not newly introduced) — `tsc --noEmit` will not catch mistakes in those files, so review their diffs more carefully.

### Design system

`constants/theme.ts` is the single source of truth for `colors`, `spacing`, `radius`, and `typography`, transcribed directly from the Figma "Design System" page (linked in the file). It also exports `screen`, the shared per-screen background/margin style described above — screens should not redefine their own `container` style.

`components/Button.tsx` and `components/Input.tsx` are the reusable primitives matching Figma's Button (`variant`: filled/outline/text × `size`: large/small, plus an extended `color` prop for success/error states not in the base Figma spec) and Input (border state driven by focus/`error`) components. Prefer these over ad hoc `TouchableOpacity`/`TextInput` for standard form fields and CTA buttons. They are deliberately *not* used for: icon-only buttons, selection toggles/chips (category chips, child-avatar circles), or compact inline fields embedded in a card (e.g. inline reward-amount fields) — those remain bespoke since they don't match the Button/Input shape. Role pickers (e.g. the parent/child toggle on `signup-page.tsx`) do use `Button`, rendering the selected option `filled` and the other `outline`.

### Backend: Supabase

All data access goes directly from the client to Supabase (`utils/supabase.ts`) — there is no intermediate API server. Row-level security policies (defined in `Application/Backend/supabase/migrations/`) are the authorization boundary, not application code.

`utils/supabase.ts` guards its client config behind `isServer = Platform.OS === 'web' && typeof window === 'undefined'`, because Expo Router's web output pre-renders pages on Node, where `window`/`AsyncStorage` don't exist — the auth storage/session options are conditionally disabled in that case.

Core schema (`Application/Backend/Database/schema.sql`): `families` (id = the founding parent's own user id) → `users` (role `parent`|`child`, linked via `family_id`) → `chores` (assigned/created/approved by a user, `status` moves `todo` → `pending` → `completed` → `approved`, or back to `todo`/`pending` on rejection) → `chore_analysis` (one row per before/after photo submission attempt, holds the AI verdict) → `transactions` (the points ledger: credits from approved chores, debits from redeemed `rewards`).

Children authenticate by username, not email: signup synthesizes a `${username}@chorepal.internal` address for Supabase Auth (which requires *some* email), resolved back to that address at login via the `find_email_by_username` RPC. Parents use a real email.

### AI chore verification pipeline

1. Child captures a "before" photo (`(child)/chores/[id].tsx`); it's uploaded to S3 via a signed URL from the `get-upload-url` edge function, and a `chore_analysis` row is created.
2. Child later captures an "after" photo the same way; this triggers the `verify-with-ai` edge function, which calls AWS Rekognition (`DetectLabelsCommand`) on the image and matches detected labels against `CATEGORY_KEYWORDS` — a keyword map keyed by the chore's `target_label` (set from the category chosen in `create-chore.tsx`, e.g. `'Dishware'`, `'Plant'`).
3. A match marks the chore `completed` (pending parent approval); a miss returns AI feedback and lets the child retry.
4. The parent reviews before/after photos and AI feedback in `(parent)/chores/[id].tsx` and approves or rejects — approval runs the `approve_chore` RPC, which credits the child's `current_balance` and logs a `transactions` row.

`Application/AI/rekognition-logic.ts` is a standalone reference version of this logic — when changing verification behavior, edit the deployed copy in `Application/Backend/supabase/functions/verify-with-ai/index.ts`, not this file.
