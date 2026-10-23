import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Icon, IconTree, IconSparkles, IconToolsKitchen2, IconQuestionMark, IconStarFilled } from '@tabler/icons-react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

// Source of truth: Figma "Design System" > Category Filter (also used as the
// category picker on Parent > New Chore)
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=721-45

export type CategoryValue = 'all' | keyof typeof colors.category;

const CATEGORY_ICONS: Record<CategoryValue, Icon> = {
  all: IconStarFilled,
  clean: IconSparkles,
  kitchen: IconToolsKitchen2,
  outdoor: IconTree,
  other: IconQuestionMark,
};

const CATEGORY_LABELS: Record<CategoryValue, string> = {
  all: 'All',
  clean: 'Clean',
  kitchen: 'Kitchen',
  outdoor: 'Outdoor',
  other: 'Other',
};

export interface CategoryProps {
  value: CategoryValue;
  selected?: boolean;
  onPress?: () => void;
  // Overrides the default per-category icon/label (e.g. a custom "Other" tag).
  icon?: Icon;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Category({ value, selected = false, onPress, icon, label, style }: CategoryProps) {
  const tone = value === 'all' ? { base: colors.brand.primary, shadow: colors.brand.primaryShadow } : colors.category[value];
  const CategoryIcon = icon ?? CATEGORY_ICONS[value];

  return (
    <View style={[styles.wrap, style]}>
      <View pointerEvents="none" style={[styles.ledge, { backgroundColor: selected ? tone.shadow : colors.shadow.ledge }]} />
      <TouchableOpacity
        style={[styles.chip, selected ? { backgroundColor: tone.base } : styles.unselected]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={[styles.iconFrame, { backgroundColor: selected ? colors.surface.white : tone.base }]}>
          <CategoryIcon size={22} color={selected ? tone.base : colors.icon.inverse} />
        </View>
        <Text style={[styles.label, { color: selected ? colors.text.inverse : colors.text.primary }]} numberOfLines={1}>
          {label ?? CATEGORY_LABELS[value]}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  // Same hard, unblurred offset-shadow "ledge" technique as Button/Chore.
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.button,
    transform: [{ translateY: 4 }],
  },
  chip: {
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.button,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  unselected: {
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  iconFrame: {
    width: 44,
    height: 44,
    borderRadius: radius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { ...typography.body },
});
