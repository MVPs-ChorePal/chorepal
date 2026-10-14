import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, Platform, Keyboard, ScrollView
} from 'react-native';
import { supabase } from '../utils/supabase';
import { isValidEmail } from '../utils/validation';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';

export default function SignupPage() {
  //generates family code
  const generateSecretCode = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let code = "";
  for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 4; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return code;
};

  const router = useRouter();
  const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [parentMode, setParentMode] = useState<'create' | 'join'>('create');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isChild = role === 'child';
  const isFormValid = !!fullName && (isChild || isValidEmail(email)) && password.length >= 6;

  //handles sign up logic
  const handleSignUp = async () => {
    setError('');
    if (!fullName || (!isChild && !email) || !password) {
      setError('please fill all fields');
      return;
    }
    if (password.length < 6) {
      setError('password must be at least 6 characters');
      return;
    }
    setLoading(true);
    //converts full name to username by removing spaces and lowercasing
    const username = fullName.toLowerCase().replace(/\s/g, "");

    //children log in by username, not email - they get an internal address
    //they never see, which only exists to satisfy supabase auth's requirement for one
    const authEmail = isChild ? `${username}@chorepal.internal` : email;

    //sign up with supabase auth and insert into users table
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: authEmail, password });

    if (authError) {
      setError(authError.message.toLowerCase());
      setLoading(false);
      return;
    }

    //insert into users table with info
    if (authData.user) {
      const isNewHousehold = role === 'parent' && parentMode === 'create';
      const secretCode = isNewHousehold ? generateSecretCode() : null; //only generate code for whoever starts a household
      const familyId = isNewHousehold ? authData.user.id : null; //household starter is their own family root

      //the family row must exist before a user can reference it as family_id
      if (isNewHousehold) {
        const { error: familyError } = await supabase.from('families').insert([{ id: familyId }]);
        if (familyError) {
          setError(familyError.message.toLowerCase());
          setLoading(false);
          return;
        }
      }

      const { error: dbError } = await supabase.from('users').insert([
        { id: authData.user.id, family_id: familyId, secret_code: secretCode, username: username, email: authEmail, display_name: fullName, role: role, current_balance: 0 }
      ]);

      //if error, show alert or else navigate to dashboard
      if (dbError) {
        setError(dbError.message.toLowerCase());
        setLoading(false);
      } else {
        setTimeout(() => {
          setLoading(false);
          if (isNewHousehold) router.replace('/(parent)/home');
          else router.replace('/join-household');
        }, 1000);
      }
    }
  };

  const isParent = role === 'parent';

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* always goes to login (the home screen of the auth flow) - not a
          "wherever you came from" back, since signup is always conceptually
          reached from there regardless of actual navigation history.
          own row, not absolutely positioned over the centered content below -
          otherwise a short/narrow viewport can render something on top of it
          that silently intercepts the tap even though the button is visible */}
      <TouchableOpacity
        onPress={() => router.replace('/login-page')}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color={colors.brand.primary} />
        <Text style={styles.backText}>back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerArea}>
          <Text style={styles.title}>Welcome to ChorePal</Text>
          <Text style={styles.subtitle}>Who is setting up this account?</Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            onPress={() => setRole('parent')}
            style={[styles.roleLabel, isParent && { borderBottomColor: colors.brand.primary }]}
          >
            <Text style={[styles.roleText, isParent && { color: colors.brand.primary }]}>parent</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRole('child')}
            style={[styles.roleLabel, !isParent && { borderBottomColor: colors.brand.primary }]}
          >
            <Text style={[styles.roleText, !isParent && { color: colors.brand.primary }]}>child</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Input
              placeholder="full name"
              onChangeText={setFullName}
              value={fullName}
              autoCapitalize="none"
              label="Your name"
            />
            <Text style={styles.hint}>your username is generated from this (lowercase, no spaces) and must be unique</Text>
          </View>

          {!isChild && (
            <Input
              placeholder="email address"
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
            />
          )}

          <View style={styles.fieldGroup}>
            <Input
              placeholder="password"
              onChangeText={setPassword}
              value={password}
              secureTextEntry
              autoCapitalize="none"
              label="Password"
            />
            <Text style={styles.hint}>must be at least 6 characters</Text>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            title="Sign up"
            onPress={handleSignUp}
            loading={loading}
            disabled={!isFormValid}
            fullWidth
          />
        </View>

        {isParent && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              onPress={() => setParentMode('create')}
              style={[styles.roleLabel, parentMode === 'create' && { borderBottomColor: colors.brand.primary }]}
            >
              <Text style={[styles.roleText, parentMode === 'create' && { color: colors.brand.primary }]}>create household</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setParentMode('join')}
              style={[styles.roleLabel, parentMode === 'join' && { borderBottomColor: colors.brand.primary }]}
            >
              <Text style={[styles.roleText, parentMode === 'join' && { color: colors.brand.primary }]}>join household</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => router.push('/login-page')} style={styles.linkContainer}>
          <Text style={styles.linkText}>
            already have an account? <Text style={[styles.linkText, { color: colors.brand.primary, fontWeight: '600' }]}>login</Text>
          </Text>
        </TouchableOpacity>
        </ScrollView>
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
  // viewport, rather than bleeding past its own box into the back button above it.
  inner: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl },
  // horizontal/top margins already come from the Stack's contentStyle (app/_layout.tsx)
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  backText: { color: colors.brand.primary, fontSize: 16, fontWeight: '600', marginLeft: 5 },
  headerArea: { gap: spacing.sm },
  title: { ...typography.h1, color: colors.text.primary, textAlign: 'center', letterSpacing: -1 },
  subtitle: { ...typography.bodyMedium, color: colors.text.tertiary, textAlign: 'center' },
  form: { width: '100%', gap: spacing.xl },
  // Pairs an input with its own caption directly beneath it, tighter than the
  // form's general item spacing.
  fieldGroup: { gap: spacing.xs },
  hint: { fontSize: 12, color: colors.text.tertiary },
  errorText: { color: colors.status.error, fontSize: 13, textAlign: 'center' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxxl },
  roleLabel: { paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  roleText: { ...typography.bodySmall, color: colors.text.tertiary },
  linkContainer: { alignItems: 'center' },
  linkText: { color: colors.text.tertiary, fontSize: 14 }
});