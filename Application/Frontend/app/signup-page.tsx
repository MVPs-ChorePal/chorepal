import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import { supabase } from '../utils/supabase';
import { isValidEmail } from '../utils/validation';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, radius } from '../constants/theme';

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
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.inner}
      >
        <View style={styles.headerArea}>
          <Text style={styles.title}>sign up</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            placeholder="full name"
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            onChangeText={setFullName}
            value={fullName}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>your username is generated from this (lowercase, no spaces) and must be unique</Text>

          {!isChild && (
            <TextInput
              placeholder="email address"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
          <TextInput
            placeholder="password"
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.hint}>must be at least 6 characters</Text>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: colors.brand.primary }, !isFormValid && styles.mainButtonDisabled]}
            onPress={handleSignUp}
            disabled={loading || !isFormValid}
          >
            <Text style={[styles.mainButtonText, { color: colors.text.inverse }]}>
              {loading ? '...' : 'sign up'}
            </Text>
          </TouchableOpacity>
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

        {isParent && (
          <View style={[styles.toggleContainer, { marginTop: 20 }]}>
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

        <TouchableOpacity onPress={() => router.push('/login-page')} style={{ marginTop: 50, alignItems: 'center' }}>
          <Text style={{ color: colors.text.tertiary, fontSize: 14 }}>
            already have an account? <Text style={{ color: colors.brand.primary, fontWeight: '600' }}>login</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.appBackground },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
  headerArea: { marginBottom: 50 },
  title: { ...typography.h1, color: colors.text.primary, textAlign: 'center', letterSpacing: -1 },
  form: { width: '100%' },
  input: { borderBottomWidth: 1, borderBottomColor: colors.border.default, paddingVertical: 15, marginBottom: 20, fontSize: 16, color: colors.text.primary },
  hint: { fontSize: 12, color: colors.text.tertiary, marginTop: -14, marginBottom: 20 },
  errorText: { color: colors.status.error, fontSize: 13, marginBottom: 15, textAlign: 'center' },
  mainButton: { paddingVertical: 18, borderRadius: radius.button, marginTop: 20, alignItems: 'center' },
  mainButtonDisabled: { opacity: 0.4 },
  mainButtonText: { fontWeight: '600', fontSize: 16, letterSpacing: 0.5 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 60, gap: 30 },
  roleLabel: { paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  roleText: { ...typography.bodySmall, color: colors.text.tertiary }
});