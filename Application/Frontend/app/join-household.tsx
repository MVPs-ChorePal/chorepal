import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { showAlert } from '@/utils/alert';
import { colors, typography, spacing } from '@/constants/theme';
import Button from '@/components/Button';

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
      showAlert("error", "code must be 7 characters");
      return;
    }

    console.log("joining household with code:", secretCode);

    //find which family this code belongs to, without reading the whole users table
    const { data: familyId, error: findError } = await supabase
      .rpc('find_family_by_code', { p_code: secretCode });

    if (findError || !familyId) {
      showAlert("error", "invalid code. check with your parent.");
      return;
    }

    //get the current logged-in user's id
    const { data: { user } } = await supabase.auth.getUser();

    //link this user to that household
    const { error: linkError } = await supabase
      .from('users')
      .update({ family_id: familyId })
      .eq('id', user?.id);

    if (linkError) {
      showAlert("error", "could not join household");
    } else {
      showAlert("success", "welcome to the family!");
      router.replace(role === 'parent' ? '/(parent)/home' : '/(child)/home');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
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
          placeholderTextColor={colors.text.tertiary}
          autoCorrect={false}
        />

        <Button title="join household" onPress={handleJoin} fullWidth />

        {role === 'child' && (
          <Button
            title="skip to camera dashboard"
            variant="text"
            size="small"
            onPress={() => router.push('/(child)/home')}
          />
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Stack's contentStyle (app/_layout.tsx).
  root: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl },
  label: { ...typography.bodyMedium, color: colors.text.primary },
  codeInput: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 5,
    fontWeight: '200',
    color: colors.text.primary
  },
});
