import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { typography, spacing } from '../../constants/theme';



// A parent screen's top row: arbitrary content on the left (a greeting, a
// BackButton, ...) and the parent's coin balance on the right. Self-fetches
// the balance (refetching on focus) so screens don't each re-derive the same
// query — pass `balance` to skip the fetch when a screen already has it.
export interface ParentHeaderProps {
  left?: React.ReactNode;
  right?: string;
  style?: StyleProp<ViewStyle>;
}

export default function ParentHeader({ left, right, style }: ParentHeaderProps) {
  
  return (
    <View style={[styles.row, style]}>
      {typeof left === 'string' ? <Text style={typography.display}>{left}</Text> : left}
      {right && <Text style={typography.display}>{right}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});

