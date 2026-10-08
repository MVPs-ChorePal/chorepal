import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function JoinHousehold() {
  const router = useRouter();
  const [secretCode, setSecretCode] = useState('');
  const [role, setRole] = useState<'parent' | 'child' | null>(null);

  useEffect(() => {
    fetchRole();
  }, []);

  //used to route correctly after joining and to hide the child-only bypass button
  async function fetchRole() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single();
    if (data) setRole(data.role);
  }

  const handleJoin = async () => {
    if (secretCode.length !== 7) {
      Alert.alert("error", "code must be 7 characters");
      return;
    }

    console.log("joining household with code:", secretCode);

    //redeem the invite - looks up, claims, and links family_id atomically
    const { data: familyId, error: redeemError } = await supabase.rpc('redeem_invite', {
      input_code: secretCode,
    });

    if (redeemError || !familyId) {
      Alert.alert("error", "invalid or already used code. ask for a new one.");
      return;
    }

    Alert.alert("success", "welcome to the family!");
    router.replace(role === 'parent' ? '/(parent)/home' : '/(child)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>

        <Text style={styles.label}>enter household code:</Text>

        <TextInput
          style={styles.codeInput}
          value={secretCode}
          onChangeText={(text) => setSecretCode(text.toUpperCase())} //forces uppercase
          autoCapitalize="characters"
          maxLength={7} //3 letters + 4 numbers
          placeholder="MVP0115"
          placeholderTextColor="#BDC4D4"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoin}>
          <Text style={styles.joinButtonText}>join household</Text>
        </TouchableOpacity>

        {role === 'child' && (
          <TouchableOpacity
            style={styles.bypassButton}
            onPress={() => router.push('/(child)/home')}
          >
            <Text style={styles.bypassText}>skip to camera dashboard</Text>
          </TouchableOpacity>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  label: { fontSize: 16, fontWeight: '300', marginBottom: 20, color: '#1A234E' },
  codeInput: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#BDC4D4',
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 5,
    fontWeight: '200',
    color: '#1A234E'
  },
  joinButton: { backgroundColor: '#FFD700', paddingVertical: 18, width: '100%', borderRadius: 10, marginTop: 40, alignItems: 'center' },
  joinButtonText: { fontWeight: '600', color: '#000' },
  bypassButton: { marginTop: 50 },
  bypassText: { color: '#005DA7', fontSize: 12, fontWeight: '300' }
});
