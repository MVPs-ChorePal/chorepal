import React, { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconChevronRight } from '@tabler/icons-react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

// White ledge-shadow card holding a list of tappable settings rows (icon,
// label, chevron), separated by dividers. Shared by the parent and child
// account screens.

export interface SettingsItem {
  label: string;
  icon: ReactNode;
  // Background of the rounded square behind the icon.
  iconBg: string;
  onPress: () => void;
}

export interface SettingsCardProps {
  items: SettingsItem[];
}

function SettingsRow({ icon, iconBg, label, onPress }: SettingsItem) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={[typography.body, styles.label]}>{label}</Text>
      <IconChevronRight size={14} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
}

export default function SettingsCard({ items }: SettingsCardProps) {
  return (
    <View>
      <View pointerEvents="none" style={styles.ledge} />
      <View style={styles.card}>
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <View style={styles.divider} />}
            <SettingsRow {...item} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Hard, unblurred offset shadow - same "ledge" technique as Button/KidCard/RewardShopItem.
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
    padding: spacing.sm,
  },
  divider: { height: 2, backgroundColor: colors.border.default },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
});
