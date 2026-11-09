import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, IconStarFilled, IconCash, IconBuildingCarousel, IconCandy } from '@tabler/icons-react-native';
import { colors, radius, spacing, typography } from '../constants/theme';
import Button from './Button';
import CoinLabel from './CoinLabel';

// Source of truth: Figma "Design System" > Reward Tile (State=Can Buy / Locked)
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=724-402

export type RewardCategoryValue = 'cash' | 'fun' | 'treats' | 'other';

const REWARD_CATEGORY_ICONS: Record<RewardCategoryValue, Icon> = {
  cash: IconCash,
  fun: IconBuildingCarousel,
  treats: IconCandy,
  other: IconStarFilled,
};

export interface RewardTileProps {
  title: string;
  cost: number;
  category?: RewardCategoryValue;
  // Swaps the CTA between the "Get it!" buy button and a disabled "Need N more" pill.
  canAfford: boolean;
  shortfall?: number;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function RewardTile({
  title,
  cost,
  category = 'other',
  canAfford,
  shortfall = 0,
  onPress,
  loading = false,
  disabled = false,
  style,
}: RewardTileProps) {
  const tone = colors.rewardCategory[category] ?? colors.rewardCategory.other;
  const CategoryIcon = REWARD_CATEGORY_ICONS[category] ?? IconStarFilled;

  return (
    <View style={style}>
      <View pointerEvents="none" style={styles.ledge} />
      <View style={styles.card}>
        <View style={[styles.art, { backgroundColor: tone.base }]}>
          <CategoryIcon size={32} color={colors.icon.inverse} />
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <CoinLabel amount={cost} size={16} />
        {canAfford ? (
          <Button title="Get it!" size="small" fullWidth onPress={onPress} loading={loading} disabled={disabled} />
        ) : (
          <View style={styles.lockedBtn}>
            <Text style={styles.lockedText}>Need {shortfall.toLocaleString()} more</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same hard, unblurred offset-shadow "ledge" technique as Button/Chore/Category.
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 5 }],
  },
  card: {
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 10,
    flex: 1,
  },
  art: {
    height: 100,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { ...typography.h3 },
  lockedBtn: {
    backgroundColor: colors.surface.neutral,
    borderRadius: radius.small,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  lockedText: { ...typography.body, color: colors.text.secondary },
});
