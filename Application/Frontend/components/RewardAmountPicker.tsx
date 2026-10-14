import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import Coin from './Coin';

// Source of truth: Figma "Parent Create Chore" > Reward
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=709-101

const PRESETS = [100, 300, 500, 1000];

export interface RewardAmountPickerProps {
  value: number;
  onChange: (value: number) => void;
  presets?: number[];
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export default function RewardAmountPicker({
  value,
  onChange,
  presets = PRESETS,
  step = 50,
  min = 0,
  max = Infinity,
  label = 'Reward',
  style,
}: RewardAmountPickerProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.card}>
        <View pointerEvents="none" style={styles.cardLedge} />
        <View style={styles.cardFace}>
          <TouchableOpacity
            style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
            onPress={() => onChange(clamp(value - step))}
            disabled={value <= min}
          >
            <Text style={styles.stepBtnLabel}>−</Text>
          </TouchableOpacity>

          <View style={styles.amountRow}>
            <Coin size={30} />
            <Text style={styles.amount}>{value.toLocaleString()}</Text>
          </View>

          <TouchableOpacity
            style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
            onPress={() => onChange(clamp(value + step))}
            disabled={value >= max}
          >
            <Text style={styles.stepBtnLabel}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.presetRow}>
        {presets.map((preset) => {
          const selected = value === preset;
          return (
            <TouchableOpacity key={preset} style={styles.presetWrap} onPress={() => onChange(preset)}>
              {selected && <View pointerEvents="none" style={styles.presetLedge} />}
              <View style={[styles.preset, selected && styles.presetSelected]}>
                <Text style={[styles.presetLabel, selected && styles.presetLabelSelected]}>
                  {preset.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Fredoka_600SemiBold', fontWeight: '600', fontSize: 20, color: colors.text.primary, marginBottom: spacing.md },
  card: { width: '100%' },
  // Hard, unblurred offset shadow — same "ledge" technique as Button.
  cardLedge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 5 }],
  },
  cardFace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  stepBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface.neutral, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnLabel: { fontFamily: 'Fredoka_700Bold', fontWeight: '700', fontSize: 24, color: colors.text.primary },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amount: { fontFamily: 'Fredoka_700Bold', fontWeight: '700', fontSize: 30, color: colors.text.primary },
  presetRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  presetWrap: {},
  presetLedge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primaryShadow,
    transform: [{ translateY: 3 }],
  },
  preset: {
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  presetSelected: { backgroundColor: colors.brand.primary, borderWidth: 0 },
  presetLabel: { fontFamily: 'Nunito_800ExtraBold', fontWeight: '800', fontSize: 15, color: colors.text.primary },
  presetLabelSelected: { color: colors.text.inverse },
});
