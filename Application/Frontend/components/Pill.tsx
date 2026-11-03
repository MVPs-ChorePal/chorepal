import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../constants/theme';

// General-purpose rounded pill — a plain tag when given just text/children,
// or a selectable chip when given `onPress` (+ `selected`). Reused across
// chip-style tags (e.g. the chore-details reward/due-date pills) and bigger
// field-style controls (e.g. Parent New Chore's child picker and date field).

export interface PillProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  bg?: string;
  textColor?: string;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Pill({
  children,
  onPress,
  selected = false,
  bg,
  textColor,
  bordered = true,
  style,
  textStyle,
}: PillProps) {
  const resolvedBg = bg ?? (selected ? colors.brand.primary : colors.surface.white);
  const resolvedTextColor = textColor ?? (selected ? colors.text.inverse : colors.text.primary);
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[
        styles.base,
        bordered && !selected && styles.bordered,
        { backgroundColor: resolvedBg },
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : undefined}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, { color: resolvedTextColor }, textStyle]} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bordered: { borderWidth: 2, borderColor: colors.border.default },
  text: { ...typography.body, fontSize: 16 },
});
