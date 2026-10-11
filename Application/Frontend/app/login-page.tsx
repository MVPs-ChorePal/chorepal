import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';

// TouchableWithoutFeedback's tap-outside-to-dismiss steals pointer focus from
// TextInput on react-native-web, so only wrap with it on native.
const DismissKeyboardWrapper = Platform.OS === 'web' ? React.Fragment : TouchableWithoutFeedback;
const dismissKeyboardProps = Platform.OS === 'web' ? {} : { onPress: Keyboard.dismiss };
import { supabase } from '../utils/supabase';
import { isValidEmail } from '../utils/validation';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <DismissKeyboardWrapper {...dismissKeyboardProps}>
          <View style={styles.inner}>
            <Text style={styles.title}>welcome back</Text>

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                onPress={() => setRole('parent')}
                style={[styles.roleLabel, isParent && { borderBottomColor: '#005DA7' }]}
              >
                <Text style={[styles.roleText, isParent && { color: '#005DA7' }]}>parent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRole('child')}
                style={[styles.roleLabel, !isParent && { borderBottomColor: '#FFD700' }]}
              >
                <Text style={[styles.roleText, !isParent && { color: '#FFD700' }]}>child</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {isParent ? (
                <TextInput
                  placeholder="email address"
                  placeholderTextColor="#999"
                  style={styles.input}
                  onChangeText={setEmail}
                  value={email}
                  autoCapitalize="none"
                />
              ) : (
                <TextInput
                  placeholder="username"
                  placeholderTextColor="#999"
                  style={styles.input}
                  onChangeText={setUsername}
                  value={username}
                  autoCapitalize="none"
                />
              )}
              <TextInput
                placeholder="password"
                placeholderTextColor="#999"
                style={styles.input}
                onChangeText={setPassword}
                value={password}
                secureTextEntry
                autoCapitalize="none"
              />

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.mainButton, !isFormValid && styles.mainButtonDisabled]}
                onPress={handleLogin}
                disabled={loading || !isFormValid}
              >
                <Text style={styles.mainButtonText}>{loading ? '...' : 'login'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/signup-page')} style={styles.linkContainer}>
              <Text style={styles.linkText}>new here? <Text style={{ color: '#005DA7', fontWeight: '600' }}>sign up</Text></Text>
            </TouchableOpacity>
          </View>
        </DismissKeyboardWrapper>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
  title: { fontSize: 32, fontWeight: '300', color: '#1A234E', textAlign: 'center', marginBottom: 30, letterSpacing: -1 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40, gap: 30 },
  roleLabel: { paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  roleText: { fontSize: 14, color: '#AAA', fontWeight: '500' },
  form: { width: '100%' },
  input: { borderBottomWidth: 1, borderBottomColor: '#BDC4D4', paddingVertical: 15, marginBottom: 20, fontSize: 16, color: '#1A234E' },
  errorText: { color: '#D32F2F', fontSize: 13, marginBottom: 15, textAlign: 'center' },
  mainButton: { backgroundColor: '#005DA7', paddingVertical: 18, borderRadius: 5, marginTop: 20, alignItems: 'center' },
  mainButtonDisabled: { opacity: 0.4 },
  mainButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  linkContainer: { marginTop: 30, alignItems: 'center' },
  linkText: { color: '#AAA', fontSize: 14 }
});
