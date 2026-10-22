import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { supabase } from '../utils/supabase';
import { isValidEmail } from '../utils/validation';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';

// TouchableWithoutFeedback's tap-outside-to-dismiss steals pointer focus from
// TextInput on react-native-web, so only wrap with it on native.
const DismissKeyboardWrapper = Platform.OS === 'web' ? React.Fragment : TouchableWithoutFeedback;
const dismissKeyboardProps = Platform.OS === 'web' ? {} : { onPress: Keyboard.dismiss };

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isParent = role === 'parent';
  const isFormValid = isParent
    ? isValidEmail(email) && password.length >= 6
    : username.length > 0 && password.length >= 6;

  //shared post-auth routing, same for both roles
  const routeAfterLogin = async (userId: string) => {
    const { data: profile } = await supabase
      .from('users')
      .select('role, family_id')
      .eq('id', userId)
      .single();

    if (profile) {
      if (!profile.family_id) {
        //no household yet (child, or a parent who chose to join one) - send to join page
        router.replace('/join-household');
      } else if (profile.role === 'parent') {
        router.replace('/(parent)/home');
      } else {
        router.replace('/(child)/home');
      }
    } else {
      router.replace('/signup-page');
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    if (isParent) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message.toLowerCase());
        setLoading(false);
        return;
      }
      if (authData.user) await routeAfterLogin(authData.user.id);
    } else {
      //children log in by username - look up the account's real (internal)
      //email first, since supabase auth only understands email, not username
      const { data: resolvedEmail, error: lookupError } = await supabase.rpc('find_email_by_username', {
        p_username: username,
      });

      if (lookupError || !resolvedEmail) {
        setError('invalid username or password');
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });
      if (authError) {
        setError('invalid username or password');
        setLoading(false);
        return;
      }
      if (authData.user) await routeAfterLogin(authData.user.id);
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* no back button here - login is the home screen of the auth flow,
          there's nothing to go back to */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <DismissKeyboardWrapper {...dismissKeyboardProps}>
          <ScrollView
            contentContainerStyle={styles.inner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Welcome Back</Text>

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
              <Input
                placeholder="password"
                onChangeText={setPassword}
                value={password}
                secureTextEntry
                autoCapitalize="none"
                label="Password"
              />

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title="login"
                onPress={handleLogin}
                loading={loading}
                fullWidth
              />
            </View>

            <TouchableOpacity onPress={() => router.push('/signup-page')} style={styles.linkContainer}>
              <Text style={{ ...typography.bodySecondary }}>New here? <Text style={{ ...typography.body, color: colors.brand.primaryShadow }}>Sign up</Text></Text>
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
  // flexGrow (not flex) because this is a ScrollView's contentContainerStyle -
  // centers short content, but scrolls instead of overflowing/clipping when
  // the content (role-dependent: parent vs child fields) is taller than the
  // viewport, rather than bleeding past its own box into whatever's above it.
  inner: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl },
  // horizontal/top margins already come from the Stack's contentStyle (app/_layout.tsx)
  title: { ...typography.display, color: colors.text.primary, textAlign: 'center', letterSpacing: -1 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxxl },
  toggleButton: {
    flex: 1,
  },
  form: { width: '100%', gap: spacing.xl },
  errorText: { ...typography.body, color: colors.status.error, textAlign: 'center' },
  linkContainer: { alignItems: 'center' },
  linkText: { ...typography.bodyTertiary }
});
