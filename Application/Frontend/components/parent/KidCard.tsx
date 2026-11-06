import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import CoinLabel from '../CoinLabel';

// Source of truth: Figma "Parent Home" > Kids
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=708-110

export interface KidCardProps {
  name: string;
  avatarColor: string;
  doneCount: number;
  totalCount: number;
  balance: number;
  style?: StyleProp<ViewStyle>;
}

export default function KidCard({ name, avatarColor, doneCount, totalCount, balance, style }: KidCardProps) {
  const isComplete = totalCount > 0 && doneCount >= totalCount;
  const progress = totalCount > 0 ? Math.min(1, doneCount / totalCount) : 0;

  return (
    <View style={[styles.wrap, style]}>
      <View pointerEvents="none" style={styles.ledge} />
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>

        <Text style={typography.h3} numberOfLines={1}>{name}</Text>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${progress * 100}%`, backgroundColor: isComplete ? colors.status.success : colors.brand.primary },
            ]}
          />
        </View>

        <Text style={typography.bodySecondary} numberOfLines={1}>{doneCount} of {totalCount} done</Text>

        <CoinLabel amount={balance} size={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  // Hard, unblurred offset shadow — same "ledge" technique as Button/Chore.
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
    gap: spacing.sm,
    alignItems: 'center',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...typography.h3, color: colors.text.inverse },
  track: { width: '100%', height: 8, borderRadius: 4, backgroundColor: colors.surface.neutral, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
