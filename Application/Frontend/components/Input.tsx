import React, { forwardRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

// Source of truth: Figma "Design System" > Input
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=558-3

export interface InputProps extends TextInputProps {
  error?: boolean;
  style?: StyleProp<TextStyle>;
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ error = false, style, containerStyle, onFocus, onBlur, placeholderTextColor, label, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error ? colors.status.error : focused ? colors.brand.primary : colors.border.default;
    const borderWidth = error || focused ? 3 : 2;

    return (
      <View style={containerStyle}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={placeholderTextColor ?? colors.text.tertiary}
          style={[styles.base, { borderColor, borderWidth }, error && { color: colors.status.error }, style]}
          {...rest}
        />
      </View>
    );
  }
);

Input.displayName = 'Input';

export default Input;

const styles = StyleSheet.create({
  label: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  base: {
    backgroundColor: colors.surface.white,
    borderRadius: radius.small,
    height: 56,
    paddingHorizontal: spacing.xxl,
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
});
