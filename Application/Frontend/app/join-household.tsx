import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { showAlert } from '@/utils/alert';
import { colors, typography, spacing } from '@/constants/theme';
import Button from '@/components/Button';
import CodeBoxes from '@/components/CodeBoxes';
import TextBox from '@/components/TextBox';

import Sweepy from '../components/Sweepy'

export default function JoinHousehold() {
  const router = useRouter();
  const [secretCode, setSecretCode] = useState('');

  const handleJoin = async () => {
    if (secretCode.length !== 7) {
      showAlert("error", "code must be 7 characters");
      return;
    }

    //the server checks the code and links this user to that household
    const { data: familyId, error: joinError } = await supabase
      .rpc('join_household', { p_code: secretCode });

    if (joinError || !familyId) {
      const reason = joinError?.message ?? '';
      showAlert("error", reason.includes('already in a household')
        ? "you're already in a household"
        : reason.includes('only children')
          ? "only kids join a household with a code. grown-ups start their own when they sign up."
          : "invalid code. check with your parent.");
      return;
    }

    //one parent per household, so only a child ever gets here successfully
    showAlert("success", "welcome to the family!");
    router.replace('/(child)/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>

        <Sweepy size={120} />
        <TextBox>
            Hi! Ask your grown-up for the household code.
        </TextBox>

        <Text style={styles.label}>Join your household</Text>

        <CodeBoxes
          value={secretCode}
          onChangeText={(text) => setSecretCode(text.toUpperCase())} //forces uppercase
          length={7} //3 letters + 4 numbers
        />

        <Text style={styles.hint}>Your grown-up can find it in their ChorePal app under Account.</Text>
        
        <Button title="Join my household" onPress={handleJoin} fullWidth />

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Stack's contentStyle (app/_layout.tsx).
  root: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl },
  label: { ...typography.display, color: colors.text.primary },
  hint: { ...typography.body, color: colors.text.secondary, textAlign: 'center'},
});
