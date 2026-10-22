import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

// Source of truth: Figma "Design System" > Button
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=558-3

type ButtonVariant = 'filled' | 'outline' | 'text';
type ButtonSize = 'large' | 'small';
type ButtonColor = 'primary' |'secondary' | 'success' | 'error';

type ColorSet = {
  bg: string;
  // null when the design system has no matching shadow/ledge token for this color.
  shadow: string | null;
  outlineText: string;
  filledText: string;
  textVariantText: string;
};

const COLOR_SETS: Record<ButtonColor, ColorSet> = {
  primary: {
    bg: colors.brand.primary,
    shadow: colors.brand.primaryShadow,
    outlineText: colors.text.primary,
    filledText: colors.text.inverse,
    textVariantText: colors.brand.primaryShadow,
  },
  secondary: {
    bg: colors.surface.white,
    shadow: colors.border.default,
    outlineText: colors.text.secondary,
    filledText: colors.text.primary,
    textVariantText: colors.border.default,
  },
  success: {
    bg: colors.status.success,
    shadow: colors.status.successShadow,
    outlineText: colors.status.success,
    filledText: colors.text.inverse,
    textVariantText: colors.status.success,
  },
  error: {
    bg: colors.status.error,
    shadow: null,
    outlineText: colors.status.error,
    filledText: colors.text.inverse,
    textVariantText: colors.status.error,
  },
};

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  // Swaps the label for a custom node (e.g. a success checkmark icon) when not loading.
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Button({
  title,
  variant = 'filled',
  size = 'large',
  color = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
  ...rest
}: ButtonProps) {
  const set = COLOR_SETS[color];
  const isLarge = size === 'large';
  const cornerRadius = isLarge ? radius.button : radius.small;
  const hasLedge = variant !== 'text';
  const ledgeColor = variant === 'filled' ? set.shadow : colors.shadow.ledge;
  const isDisabled = disabled || loading;

  const paddingStyle = isLarge
    ? { paddingHorizontal: spacing.xxxl, paddingVertical: spacing.xxl }
    : { paddingHorizontal: spacing.xxl, paddingVertical: spacing.md };

  const textFont = isLarge ? typography.h2 : typography.h3;
  const textColor =
    variant === 'filled' ? set.filledText : variant === 'outline' ? set.outlineText : set.textVariantText;

  return (
    <View style={[fullWidth && styles.fullWidth, style]}>
      {hasLedge && ledgeColor && (
        <View
          style={[styles.ledge, { borderRadius: cornerRadius, backgroundColor: ledgeColor, pointerEvents: 'none' }]}
        />
      )}
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isDisabled}
        style={[
          styles.base,
          paddingStyle,
          { borderRadius: cornerRadius },
          variant === 'filled' && { backgroundColor: set.bg },
          variant === 'outline' && styles.outline,
          isDisabled && styles.disabled,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : icon ? (
          icon
        ) : (
          <Text style={[{ ...textFont, color: textColor }, styles.label, textStyle]}>{title}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  // The Figma "ledge" shadow is a hard, unblurred 5px offset duplicate of the
  // button shape, not a soft native shadow — so it's drawn as a real layer
  // behind the button rather than via shadowColor/elevation.
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ translateY: 5 }],
  },
  base: { alignItems: 'center', justifyContent: 'center' },
  outline: { backgroundColor: colors.surface.white, borderWidth: 2, borderColor: colors.border.default },
  disabled: { opacity: 0.4 },
  label: { textAlign: 'center' },
});
