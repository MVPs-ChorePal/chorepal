import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

// Visual twin of <Button size="small" color="secondary" /> for non-interactive
// text — same white chip, ledge shadow, and Fredoka label, minus the TouchableOpacity.
// Source of truth: Figma "Design System" > Button
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=558-3

export interface TextBoxProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function TextBox({ children, style, textStyle }: TextBoxProps) {
  return (
    <View style={style}>
      <View pointerEvents="none" style={styles.ledge} />
      <View style={styles.box}>
        <Text style={[styles.label, textStyle]}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same hard, unblurred offset-shadow "ledge" technique as Button, at the same 5px offset.
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.small,
    backgroundColor: colors.border.default,
    transform: [{ translateY: 5 }],
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.small,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.white,
  },
  label: { ...typography.body, color: colors.text.primary, textAlign: 'center' },
});
