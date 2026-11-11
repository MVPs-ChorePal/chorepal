import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { colors, typography } from '../constants/theme';
import { REWARD_CATEGORY_ICONS, RewardCategoryValue } from '../constants/rewardCategories';
import Coin from './Coin';
import Pill from './Pill';

// One row of points activity - a redeemed reward (debit) or a completed
// chore's payout (credit). Same layout as the reward shop's RewardShopItem
// (colored icon tile, Fredoka title, coin amount) so the two lists read as
// one design. Shared by the parent and child Rewards screens; render rows
// inside a white ledge card with dividers, like the reward shop list.
//
// The right-hand slot is one of:
//  - onMarkGiven: a "Mark given" button (parent, redemption not handed over)
//  - status: a read-only pill, e.g. "Given" / "On its way" (child)
//  - neither: nothing

export interface RewardActivityItemProps {
  title: string;
  // Second line, e.g. "Mario · Nov 10" or just the date.
  subtitle?: string;
  amount: number;
  type: 'credit' | 'debit';
  // Reward category for redemptions (sets the tile color/icon); ignored for credits.
  category?: RewardCategoryValue;
  onMarkGiven?: () => void;
  status?: { label: string; done: boolean };
  style?: StyleProp<ViewStyle>;
}

export default function RewardActivityItem({
  title,
  subtitle,
  amount,
  type,
  category = 'other',
  onMarkGiven,
  status,
  style,
}: RewardActivityItemProps) {
  const isCredit = type === 'credit';
  const tone = isCredit
    ? { base: colors.status.success }
    : colors.rewardCategory[category] ?? colors.rewardCategory.other;
  const TileIcon = isCredit ? IconCheck : REWARD_CATEGORY_ICONS[category] ?? REWARD_CATEGORY_ICONS.other;

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.tile, { backgroundColor: tone.base }]}>
        <TileIcon size={24} color={colors.icon.inverse} />
      </View>

      <View style={styles.content}>
        <Text style={typography.h3} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={typography.bodySecondary} numberOfLines={1}>{subtitle}</Text> : null}
        <View style={styles.amountRow}>
          <Coin size={17} />
          <Text style={[typography.body, { color: isCredit ? colors.status.successText : colors.text.primary }]}>
            {isCredit ? '+' : '-'}{amount.toLocaleString()}
          </Text>
        </View>
      </View>

      {onMarkGiven ? (
        <Pill selected onPress={onMarkGiven}>Mark given</Pill>
      ) : status ? (
        <Pill
          bordered={false}
          bg={status.done ? colors.status.successSubtle : colors.status.warningSubtle}
          textColor={status.done ? colors.status.successText : colors.status.warningText}
        >
          {status.label}
        </Pill>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10 },
  tile: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
