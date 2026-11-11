import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import RewardActivityItem, { RewardActivityItemProps } from './RewardActivityItem';

// White ledge-shadow card listing RewardActivityItem rows with dividers -
// the same card style as the parent's reward shop list. Shared by the
// parent Rewards "To hand out" list and the child Rewards "History".

export type RewardActivityListItem = RewardActivityItemProps & { id: string };

export interface RewardActivityListProps {
  items: RewardActivityListItem[];
  style?: StyleProp<ViewStyle>;
}

export default function RewardActivityList({ items, style }: RewardActivityListProps) {
  return (
    <View style={style}>
      <View pointerEvents="none" style={styles.ledge} />
      <View style={styles.card}>
        {items.map(({ id, ...item }, i) => (
          <React.Fragment key={id}>
            {i > 0 && <View style={styles.divider} />}
            <RewardActivityItem {...item} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Hard, unblurred offset shadow - same "ledge" technique as Button/KidCard.
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
});
