import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography } from '../../constants/theme';
import { REWARD_CATEGORY_ICONS, RewardCategoryValue } from '../../constants/rewardCategories';
import CoinLabel from '../CoinLabel';
import Pill from '../Pill';

// Source of truth: Figma "Parent Rewards" > Your reward shop > row
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=709-176

export interface RewardShopItemProps {
  title: string;
  cost: number;
  category?: RewardCategoryValue;
  onEdit?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function RewardShopItem({ title, cost, category = 'other', onEdit, style }: RewardShopItemProps) {
  const tone = colors.rewardCategory[category] ?? colors.rewardCategory.other;
  const CategoryIcon = REWARD_CATEGORY_ICONS[category] ?? REWARD_CATEGORY_ICONS.other;

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.art, { backgroundColor: tone.base }]}>
        <CategoryIcon size={26} color={colors.icon.inverse} />
      </View>
      <View style={styles.content}>
        <Text style={typography.h3} numberOfLines={1}>{title}</Text>
        <CoinLabel amount={cost} size={16} />
      </View>
      <Pill onPress={onEdit}>Edit</Pill>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10 },
  art: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 4 },
});
