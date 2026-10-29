import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Icon, IconChevronRight } from '@tabler/icons-react-native';
import { colors, typography, radius } from '../constants/theme';
import { CATEGORY_ICONS, CategoryValue } from '../constants/choreCategories';
import CoinLabel from './CoinLabel';

// Source of truth: Figma "Wireframes" > Child Chores > Quest Card
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=656-40


type ChoreCategory = Exclude<CategoryValue, 'all'>;
type ChoreStatus = 'todo' | 'pending' | 'completed';

const STATUS_CHIP: Partial<Record<ChoreStatus, { label: string; bg: string; border: string; text: string }>> = {
  pending: { label: 'Pending…', bg: colors.status.warningSubtle, border: colors.status.warning, text: colors.status.warningText },
  completed: { label: 'Completed', bg: colors.status.successSubtle, border: colors.status.success, text: colors.status.successText },
};

export interface ChoreProps {
  title: string;
  reward_amount: number;
  category?: ChoreCategory;
  icon?: Icon;
  status?: ChoreStatus;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Chore({ title, reward_amount, category = 'other', icon, status = 'todo', onPress, style }: ChoreProps) {
  const categoryColors = colors.category[category];
  const chip = STATUS_CHIP[status];
  const CategoryIcon = icon ?? CATEGORY_ICONS[category];



  return (
    <View style={style}>
      <View pointerEvents="none" style={styles.ledge} />
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} disabled={!onPress}>
        <View style={styles.iconWrap}>
          <View style={[styles.iconLedge, { backgroundColor: categoryColors.shadow }]} />
          <View style={[styles.iconFrame, { backgroundColor: categoryColors.base }]}>
            <CategoryIcon size={28} color={colors.icon.inverse} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={typography.h3} numberOfLines={1}>{title}</Text>
          <CoinLabel amount={reward_amount} size={16} />
        </View>

        {chip ? (
          <View style={[styles.chip, { backgroundColor: chip.bg, borderColor: chip.border }]}>
            <Text style={[styles.chipText, { color: chip.text }]}>{chip.label}</Text>
          </View>
        ) : (
          <View style={styles.openWrap}>
            <View style={styles.openLedge} />
            <View style={styles.openButton}>
              <IconChevronRight size={20} color={colors.icon.inverse} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}



const styles = StyleSheet.create({
  // Hard, unblurred offset shadow behind the card — same "ledge" technique as Button/CoinBadge.
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    padding: 14,
  },
  iconWrap: { width: 64, height: 64 },
  iconLedge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.button,
    transform: [{ translateY: 4 }],
  },
  iconFrame: {
    width: 64,
    height: 64,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, gap: 6, alignItems: 'flex-start' },
  chip: {
    borderWidth: 2,
    borderRadius: radius.small,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { ...typography.body, fontSize: 16 },
  openWrap: { width: 48, height: 48 },
  openLedge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primaryShadow,
    transform: [{ translateY: 4 }],
  },
  openButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
