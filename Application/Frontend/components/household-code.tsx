import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../utils/supabase';
import { showShare } from '../utils/share';
import { colors, radius, spacing, typography } from '../constants/theme';

// Source of truth: Figma "Parent Account" > Family code
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=710-74

// Card uses the warning/pending tokens (not brand) - matches the yellow
// treatment Figma gives this card specifically, distinct from every other
// bordered-white card on this screen.
const CARD_RADIUS = 28;
const LETTER_RADIUS = 12;

//shows the household's join code so the parent can give it to their kids
export default function HouseholdCode() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCode = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      //the code belongs to whoever created the household, which may not be
      //this parent - looked up server-side so this never needs to read
      //other users' rows directly
      const { data, error } = await supabase.rpc('get_household_code');
      if (error) throw error;
      setCode(data ?? null);
    } catch (e: any) {
      console.error('FETCH CODE ERROR:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchCode(); }, [fetchCode]));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>FAMILY CODE</Text>
      {loading ? (
        <ActivityIndicator color={colors.status.warningText} style={{ marginVertical: 10 }} />
      ) : code ? (
        <>
          <View style={styles.lettersRow}>
            {code.split('').map((letter, i) => (
              <View key={i} style={styles.letterBox}>
                <Text style={styles.letter}>{letter}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.label}>Kids type this code to join your family.</Text>
          <View style={styles.shareWrap}>
            <View pointerEvents="none" style={styles.shareLedge} />
            <TouchableOpacity style={styles.shareButton} activeOpacity={0.85} onPress={() => showShare(code)}>
              <Text style={styles.shareText}>Share code</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={styles.label}>no household code found</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.status.warning,
    borderRadius: CARD_RADIUS,
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
  },
  label: { ...typography.body, color: colors.status.warningText },
  lettersRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  letterBox: {
    flex: 1,
    height: 54,
    borderRadius: LETTER_RADIUS,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { ...typography.display, fontSize: 32 },
  shareWrap: { width: '100%' },
  // Hard, unblurred offset shadow - same "ledge" technique as Button, but
  // tinted to the card's own pending/warning shadow instead of the generic
  // border shadow, so it reads as part of this card rather than a stray
  // Button instance.
  shareLedge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.small,
    backgroundColor: colors.status.pending,
    transform: [{ translateY: 4 }],
  },
  shareButton: {
    backgroundColor: colors.surface.white,
    borderRadius: radius.small,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: { ...typography.h3 },
});
