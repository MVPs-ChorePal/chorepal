import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

//generates a single-use invite code
const generateInviteCode = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let code = "";
  for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 4; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return code;
};

//lets a parent generate a single-use invite code and share it with whoever's joining
export default function HouseholdCode() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateInvite = async () => {
    setLoading(true);
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

      const newCode = generateInviteCode();
      const { error: inviteError } = await supabase.from('invites').insert([
        { family_id: profile.family_id, code: newCode }
      ]);
      if (inviteError) throw inviteError;

      setCode(newCode);
    } catch (e: any) {
      console.error('GENERATE INVITE ERROR:', e.message);
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.hint}>one-time use - they enter this to join. generate a new one for each person.</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={16} color="#FFF" />
            <Text style={styles.shareText}>share code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.shareBtn} onPress={handleGenerateInvite}>
          <Text style={styles.shareText}>generate invite code</Text>
        </TouchableOpacity>
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
