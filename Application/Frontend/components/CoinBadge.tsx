import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius } from '../constants/theme';
import Coin from './Coin';

// Source of truth: Figma "Child Home" > Header > Coins
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=656-14

export interface CoinBadgeProps {
  amount: number;
  style?: StyleProp<ViewStyle>;
}

export default function CoinBadge({ amount, style }: CoinBadgeProps) {
  return (
    <View style={[styles.wrap, style]}>
      {/* Hard, unblurred offset shadow — same "ledge" technique as Button. */}
      <View pointerEvents="none" style={styles.ledge} />
      <View style={styles.pill}>
        <Coin size={26} />
        <Text style={styles.amount}>{amount.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 3 }],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.full,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 6,
  },
  amount: {
    fontFamily: 'Fredoka_700Bold',
    fontWeight: '700',
    fontSize: 18,
    color: colors.text.primary,
  },
});
