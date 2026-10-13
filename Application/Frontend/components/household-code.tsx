import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { colors, typography, radius } from '../constants/theme';

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

  const handleShare = () => {
    if (!code) return;
    Share.share({ message: `join our household on chorepal with this code: ${code}` });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>household code</Text>
      {loading ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 10 }} />
      ) : code ? (
        <>
          <Text style={styles.code} selectable>{code}</Text>
          <Text style={styles.hint}>kids enter this after signing up to join your household</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={16} color={colors.text.inverse} />
            <Text style={styles.shareText}>share code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.hint}>no household code found</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.white, borderRadius: radius.card, padding: 25, alignItems: 'center', width: '100%' },
  label: { ...typography.labelSmall, color: colors.brand.primary, textTransform: 'uppercase' },
  code: { fontSize: 34, fontWeight: '200', color: colors.text.primary, letterSpacing: 6, marginTop: 10 },
  hint: { fontSize: 12, color: colors.text.secondary, textAlign: 'center', marginTop: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: radius.button, paddingHorizontal: 18, paddingVertical: 10, marginTop: 15 },
  shareText: { color: colors.text.inverse, fontWeight: '700', fontSize: 13 },
});
