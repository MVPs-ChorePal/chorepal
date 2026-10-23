import { CategoryValue } from '../components/Category';

// Maps each visual chore category (components/Category.tsx) to the AI target
// label matched by the verify-with-ai edge function's CATEGORY_KEYWORDS
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
