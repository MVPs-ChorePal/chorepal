import { Icon, IconBuildingCarousel, IconCandy, IconCash, IconStarFilled } from '@tabler/icons-react-native';
import { colors } from './theme';

// Single source of truth for the "reward category" concept — the type, its
// icon, and label — shared between the child-facing reward grid
// (components/RewardTile.tsx) and the parent-facing reward shop list/editor
// (components/parent/RewardShopItem.tsx, app/(parent)/rewards/create-reward.tsx).
export type RewardCategoryValue = keyof typeof colors.rewardCategory;

export const REWARD_CATEGORIES: RewardCategoryValue[] = ['fun', 'treats', 'cash', 'other'];

export const REWARD_CATEGORY_ICONS: Record<RewardCategoryValue, Icon> = {
  cash: IconCash,
  fun: IconBuildingCarousel,
  treats: IconCandy,
  other: IconStarFilled,
};

export const REWARD_CATEGORY_LABELS: Record<RewardCategoryValue, string> = {
  cash: 'Cash',
  fun: 'Fun',
  treats: 'Treats',
  other: 'Other',
};
