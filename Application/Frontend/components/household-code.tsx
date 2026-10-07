import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

//shows the household's join code so the parent can give it to their kids
export default function HouseholdCode() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCode = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', session.user.id)
        .single();
      if (profileError) throw profileError;
      if (!profile.family_id) return;

      //the code belongs to whoever created the household, which may not be this parent
      const { data: owner, error: ownerError } = await supabase
        .from('users')
        .select('secret_code')
        .eq('family_id', profile.family_id)
        .not('secret_code', 'is', null)
        .limit(1)
        .maybeSingle();
      if (ownerError) throw ownerError;
      setCode(owner?.secret_code ?? null);
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
        <ActivityIndicator color="#005DA7" style={{ marginVertical: 10 }} />
      ) : code ? (
        <>
          <Text style={styles.code} selectable>{code}</Text>
          <Text style={styles.hint}>kids enter this after signing up to join your household</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={16} color="#FFF" />
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
  card: { backgroundColor: '#FFF', borderRadius: 25, padding: 25, alignItems: 'center', width: '100%' },
  label: { fontSize: 11, fontWeight: '800', color: '#005DA7', textTransform: 'uppercase' },
  code: { fontSize: 34, fontWeight: '200', color: '#1A234E', letterSpacing: 6, marginTop: 10 },
  hint: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#005DA7', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginTop: 15 },
  shareText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
