import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'expo-router';

//generates a single-use invite code
const generateInviteCode = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let code = "";
  for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 4; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return code;
};

export default function ParentAccount() {
  const router = useRouter();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerateInvite = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.family_id) return;

      const code = generateInviteCode();
      const { error } = await supabase.from('invites').insert([
        { family_id: profile.family_id, code }
      ]);

      if (!error) setGeneratedCode(code);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>account</Text>

      <View style={styles.content}>
        {generatedCode && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>share this code</Text>
            <Text style={styles.codeText}>{generatedCode}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.generateButton} onPress={handleGenerateInvite} disabled={generating}>
          <Text style={styles.generateButtonText}>{generating ? '...' : 'generate invite code'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => supabase.auth.signOut().then(() => router.replace('/login-page'))}
        style={styles.logoutButton}
      >
        <Text style={styles.logoutText}>logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF', padding: 25 },
  title: { fontSize: 24, fontWeight: '300', color: '#005DA7', letterSpacing: -1, marginBottom: 20 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  codeCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 30 },
  codeLabel: { fontSize: 11, fontWeight: '800', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 10 },
  codeText: { fontSize: 28, fontWeight: '700', color: '#1A234E', letterSpacing: 4 },
  generateButton: { backgroundColor: '#005DA7', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 15, alignItems: 'center' },
  generateButtonText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  logoutButton: { alignItems: 'center', marginBottom: 70 },
  logoutText: { color: '#005DA7', textDecorationLine: 'underline', fontWeight: '300' }
});
