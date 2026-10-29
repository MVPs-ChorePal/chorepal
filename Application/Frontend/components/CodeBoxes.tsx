import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputInstance, View } from 'react-native';
import { colors } from '../constants/theme';

// Source of truth: Figma "Child Join Family (Secret Code)" > Code boxes
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=702-22

export interface CodeBoxesProps {
  value: string;
  onChangeText: (text: string) => void;
  length: number;
  autoFocus?: boolean;
}

export default function CodeBoxes({ value, onChangeText, length, autoFocus }: CodeBoxesProps) {
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);

  // The next empty box is "active" only while the hidden input is focused.
  const activeIndex = focused && value.length < length ? value.length : -1;

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i];
        const isActive = i === activeIndex;
        const borderColor = isActive ? colors.brand.primary : colors.border.default;
        const shadowColor = isActive ? colors.brand.primaryShadow : colors.shadow.ledge;

        return (
          <View key={i} style={styles.box}>
            {/* Figma's shadow is a hard, unblurred offset duplicate, not a soft native shadow. */}
            <View pointerEvents="none" style={[styles.ledge, { backgroundColor: shadowColor }]} />
            <View style={[styles.boxFace, { borderColor, borderWidth: isActive ? 3 : 2 }]}>
              {char ? <Text style={styles.char}>{char}</Text> : isActive ? <View style={styles.cursor} /> : null}
            </View>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={autoFocus}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%', gap: 10, justifyContent: 'center' },
  box: { flex: 1, maxWidth: 50, height: 64 },
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    transform: [{ translateY: 4 }],
  },
  boxFace: {
    flex: 1,
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: {
    fontFamily: 'Fredoka_700Bold',
    fontWeight: '700',
    fontSize: 30,
    color: colors.text.primary,
  },
  cursor: {
    width: 3,
    height: 30,
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
