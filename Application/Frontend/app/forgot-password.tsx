import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { supabase } from '../utils/supabase';
import { isValidEmail } from '../utils/validation';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';

// Same tap-outside-to-dismiss caveat as login-page.tsx: steals pointer focus
// from TextInput on react-native-web, so only wrap with it on native.
const DismissKeyboardWrapper = Platform.OS === 'web' ? React.Fragment : TouchableWithoutFeedback;
const dismissKeyboardProps = Platform.OS === 'web' ? {} : { onPress: Keyboard.dismiss };

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();

  const [role, setRole] = useState<'parent' | 'child'>(params.role === 'child' ? 'child' : 'parent');
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isParent = role === 'parent';
  const requestIsValid = isParent ? isValidEmail(email) : username.length > 0;
  const confirmIsValid = code.length > 0 && newPassword.length >= 6;

  //shared post-reset routing, same logic as login-page.tsx
  const routeAfterReset = async (userId: string) => {
    const { data: profile } = await supabase.from('users').select('role, family_id').eq('id', userId).single();
    if (!profile) return router.replace('/login-page');
    if (!profile.family_id) router.replace('/join-household');
    else if (profile.role === 'parent') router.replace('/(parent)/(tabs)/home');
    else router.replace('/(child)/(tabs)/home');
  };

  //step 1: look up the real email (for a child, via the same username ->
  //email resolution login uses) and ask Supabase to send a reset code to it.
  //A child's account email is a plus-addressed variant of their parent's
  //real address (see link-child-email), so the code lands in the parent's
  //inbox - the parent reads it off and finishes the reset.
  const handleRequestCode = async () => {
    setError('');
    setLoading(true);

    let targetEmail = email;
    if (!isParent) {
      const { data: lookedUpEmail, error: lookupError } = await supabase.rpc('find_email_by_username', {
        p_username: username,
      });
      if (lookupError || !lookedUpEmail) {
        setError('could not find that username');
        setLoading(false);
        return;
      }
      targetEmail = lookedUpEmail;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail);
    setLoading(false);

    if (resetError) {
      setError(resetError.message.toLowerCase());
      return;
    }

    setResolvedEmail(targetEmail);
    setStep('confirm');
  };

  //step 2: verifying the code signs them in (it's a one-time password), then
  //updateUser actually changes the password while that session is active
  const handleConfirmReset = async () => {
    setError('');
    setLoading(true);

    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      email: resolvedEmail,
      token: code,
      type: 'recovery',
    });
    if (otpError || !otpData.user) {
      setError('that code is invalid or expired');
      setLoading(false);
      return;
    }

    //there's no direct "does this match the current password" check, so
    //this tries signing in with the new password - if that succeeds, the
    //new password is the current one, since a wrong password would fail
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: newPassword,
    });
    if (!signInError) {
      setError('new password must be different from your current password');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError(updateError.message.toLowerCase());
      return;
    }

    await routeAfterReset(otpData.user.id);
  };

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <DismissKeyboardWrapper {...dismissKeyboardProps}>
          <ScrollView
            contentContainerStyle={styles.inner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Forgot Password?</Text>

            {step === 'request' ? (
              <>
                <Text style={styles.subtitle}>
                  {isParent
                    ? "We'll email you a code to reset it."
                    : "We'll send a code to your grown-up's email."}
                </Text>

                <View style={styles.toggleContainer}>
                  <Button
                    title="I'm a grown-up"
                    variant={isParent ? 'filled' : 'outline'}
                    size="small"
                    style={styles.toggleButton}
                    onPress={() => setRole('parent')}
                  />
                  <Button
                    title="I'm a child"
                    variant={!isParent ? 'filled' : 'outline'}
                    size="small"
                    style={styles.toggleButton}
                    onPress={() => setRole('child')}
                  />
                </View>

                <View style={styles.form}>
                  {isParent ? (
                    <Input
                      placeholder="you@email.com"
                      onChangeText={setEmail}
                      value={email}
                      autoCapitalize="none"
                      label="Email"
                    />
                  ) : (
                    <Input
                      placeholder="username"
                      onChangeText={setUsername}
                      value={username}
                      autoCapitalize="none"
                      label="Username"
                    />
                  )}

                  {!!error && <Text style={styles.errorText}>{error}</Text>}

                  <Button
                    title="Send reset code"
                    onPress={handleRequestCode}
                    loading={loading}
                    disabled={!requestIsValid}
                    fullWidth
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  {`Enter the code sent to ${resolvedEmail} and choose a new password.`}
                </Text>

                <View style={styles.form}>
                  <Input
                    placeholder="123456"
                    onChangeText={setCode}
                    value={code}
                    keyboardType="number-pad"
                    label="Reset code"
                  />
                  <Input
                    placeholder="new password"
                    onChangeText={setNewPassword}
                    value={newPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    label="New password"
                  />

                  {!!error && <Text style={styles.errorText}>{error}</Text>}

                  <Button
                    title="Reset password"
                    onPress={handleConfirmReset}
                    loading={loading}
                    disabled={!confirmIsValid}
                    fullWidth
                  />
                </View>

                <TouchableOpacity onPress={() => { setStep('request'); setError(''); }} style={styles.linkContainer}>
                  <Text style={{ ...typography.bodySecondary }}>Didn't get a code? <Text style={{ ...typography.body, color: colors.brand.primaryShadow }}>Try again</Text></Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => router.push('/login-page')} style={styles.linkContainer}>
              <Text style={{ ...typography.bodySecondary }}>Back to <Text style={{ ...typography.body, color: colors.brand.primaryShadow }}>Login</Text></Text>
            </TouchableOpacity>
          </ScrollView>
        </DismissKeyboardWrapper>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Stack's contentStyle (app/_layout.tsx).
  root: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl },
  title: { ...typography.display, color: colors.text.primary, textAlign: 'center', letterSpacing: -1 },
  subtitle: { ...typography.bodySecondary, textAlign: 'center' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: spacing.xxxl },
  toggleButton: { flex: 1 },
  form: { width: '100%', gap: spacing.xl },
  errorText: { ...typography.body, color: colors.status.error, textAlign: 'center' },
  linkContainer: { alignItems: 'center' },
});
