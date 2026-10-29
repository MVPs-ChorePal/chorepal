import { Icon, IconQuestionMark, IconSparkles, IconStarFilled, IconToolsKitchen2, IconTree } from '@tabler/icons-react-native';
import { colors } from './theme';

// Single source of truth for the "chore category" concept — the type, its
// icon, and the mapping to/from the AI target label. Defined here (not in
// components/Category.tsx) so components/Category.tsx and components/Chore.tsx
// can both import from this file without a circular dependency between them.
export type CategoryValue = 'all' | keyof typeof colors.category;

export const CATEGORY_ICONS: Record<CategoryValue, Icon> = {
  all: IconStarFilled,
  clean: IconSparkles,
  kitchen: IconToolsKitchen2,
  outdoor: IconTree,
  other: IconQuestionMark,
};

// Maps each visual chore category to the AI target label matched by the
// verify-with-ai edge function's CATEGORY_KEYWORDS
// (Application/Backend/supabase/functions/verify-with-ai/index.ts). `chores`
// has no dedicated category column, so this mapping is the single source of
// truth for going from a picked category to a stored target_label and back.
export const CATEGORY_AI_TAGS: Record<Exclude<CategoryValue, 'all'>, string> = {
  clean: 'Waste Container',
  kitchen: 'Dishware',
  outdoor: 'Plant',
  other: 'Other',
};

const TAG_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_AI_TAGS).map(([category, tag]) => [tag, category])
) as Record<string, Exclude<CategoryValue, 'all'>>;

export const categoryForTag = (tag?: string | null): Exclude<CategoryValue, 'all'> =>
  (tag && TAG_TO_CATEGORY[tag]) || 'other';
