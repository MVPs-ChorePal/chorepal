import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../constants/theme';

// Small orange (brand primary) circle with a count inside, e.g. next to a
// section heading ("Needs your OK  (3)"). Stays a circle for 1-digit counts
// and stretches into a pill for longer ones.

const SIZE = 28;

export interface CountBadgeProps {
  count: number;
  style?: StyleProp<ViewStyle>;
}

export default function CountBadge({ count, style }: CountBadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: SIZE,
    height: SIZE,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { ...typography.body, fontSize: 14, lineHeight: 18, color: colors.text.inverse },
});
