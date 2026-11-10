import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import Button from '../Button';
import CoinLabel from '../CoinLabel';

// Source of truth: Figma "Parent Rewards" > Requests
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=709-152

export interface RewardRequestCardProps {
  childName: string;
  avatarColor: string;
  rewardTitle: string;
  cost: number;
  onAccept?: () => void;
  onDecline?: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function RewardRequestCard({
  childName,
  avatarColor,
  rewardTitle,
  cost,
  onAccept,
  onDecline,
  loading = false,
  style,
}: RewardRequestCardProps) {
  return (
    <View style={style}>
      <View pointerEvents="none" style={styles.ledge} />
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitial}>{childName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.wants} numberOfLines={1}>{childName} wants</Text>
            <Text style={typography.h3} numberOfLines={1}>{rewardTitle}</Text>
          </View>
          <CoinLabel amount={cost} size={16} />
        </View>

        <View style={styles.actions}>
          <Button title="Say yes" size="small" onPress={onAccept} loading={loading} disabled={loading} style={styles.actionBtn} />
          <Button title="Not now" size="small" variant="outline" onPress={onDecline} disabled={loading} style={styles.actionBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same hard, unblurred offset-shadow "ledge" technique as Button/Chore/RewardTile.
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.status.pending,
    transform: [{ translateY: 5 }],
  },
  card: {
    backgroundColor: colors.status.warningSubtle,
    borderWidth: 2,
    borderColor: colors.status.warning,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...typography.h3, color: colors.text.inverse },
  content: { flex: 1, gap: 2 },
  wants: { ...typography.body, fontSize: 16, color: colors.status.warningText, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});
