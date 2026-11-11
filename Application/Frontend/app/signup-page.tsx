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
import Sweepy from '../components/Sweepy';

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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isChild = role === 'child';
  const isFormValid = !!fullName && !!username && (isChild || isValidEmail(email)) && password.length >= 6;

  //handles sign up logic
  const handleSignUp = async () => {
    setError('');
    if (!fullName || !username || (!isChild && !email) || !password) {
      setError('Please fill all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);

    //normalized the same way a generated username used to be (lowercase, no
    //spaces) - find_email_by_username matches it exactly, so this has to
    //stay consistent with whatever the user types at login
    const normalizedUsername = username.trim().toLowerCase().replace(/\s/g, '');

    const { data: isTaken, error: usernameCheckError } = await supabase.rpc('is_username_taken', {
      p_username: normalizedUsername,
    });
    if (usernameCheckError) {
      setError(usernameCheckError.message.toLowerCase());
      setLoading(false);
      return;
    }
    if (isTaken) {
      setError('that username is already taken');
      setLoading(false);
      return;
    }

    //children log in by username, not email - they get an internal address
    //they never see, which only exists to satisfy supabase auth's requirement for one
    const authEmail = isChild ? `${normalizedUsername}@chorepal.internal` : email;

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
        { id: authData.user.id, family_id: familyId, secret_code: secretCode, username: normalizedUsername, email: authEmail, display_name: fullName, role: role, current_balance: 0 }
      ]);

      //if error, show alert or else navigate to dashboard
      if (dbError) {
        //23505 = unique_violation - the availability check above already
        //covers the common case, this only fires on a rare race between two
        //simultaneous signups for the same username
        setError(dbError.code === '23505' ? 'that username is already taken' : dbError.message.toLowerCase());
        setLoading(false);
      } else {
        setTimeout(() => {
          setLoading(false);
          if (isNewHousehold) router.replace('/(parent)/(tabs)/home');
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
          <Sweepy size={120} />
          <Text style={{...typography.display}}>Welcome to ChorePal!</Text>
          <Text style={{...typography.bodySecondary}}>Who is setting up this account?</Text>
        </View>

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
          <View style={styles.fieldGroup}>
            <Input
              placeholder="e.g. John Doe"
              onChangeText={setFullName}
              value={fullName}
              autoCapitalize="none"
              label="Your name"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Input
              placeholder="e.g. johndoe"
              onChangeText={setUsername}
              value={username}
              autoCapitalize="none"
              label="Username"
            />
          </View>

          {!isChild && (
            <Input
              placeholder="you@email.com"
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
            />
          )}

          <View style={styles.fieldGroup}>
            <Input
              placeholder="********"
              onChangeText={setPassword}
              value={password}
              secureTextEntry
              autoCapitalize="none"
              label="Password"
            />
            {/* <Text style={styles.hint}>must be at least 6 characters</Text> */}
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            title={role === 'parent' ? 'Create family account' : 'Sign up'}
            onPress={handleSignUp}
            loading={loading}
            // disabled={!isFormValid}
            fullWidth
          />
        </View>

        {/* NOT SURE IF WE NEED THIS */}
        {/* {isParent && (
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
        )} */}
        {/* replace, not push - see login-page.tsx's "Forgot password?" link */}
        <TouchableOpacity onPress={() => router.replace('/login-page')} style={styles.linkContainer}>
          <Text style={{ ...typography.bodySecondary }}>Already have an account? <Text style={{ ...typography.body, color: colors.brand.primaryShadow }}>Login</Text></Text>
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
  headerArea: { gap: spacing.sm, alignItems: 'center' },
  title: { ...typography.display, color: colors.text.primary, textAlign: 'center', letterSpacing: -1 },
  subtitle: { ...typography.body, color: colors.text.tertiary, textAlign: 'center' },
  form: { width: '100%', gap: spacing.xl },
  // Pairs an input with its own caption directly beneath it, tighter than the
  // form's general item spacing.
  fieldGroup: { gap: spacing.xs },
  hint: { fontSize: 12, color: colors.text.tertiary },
  errorText: { color: colors.status.error, fontSize: 13},
  // alignItems: 'flex-start' (not the row default 'stretch') so each toggle
  // button keeps its own natural height instead of being stretched to match
  // whichever label wraps to more lines - stretching left the shorter
  // button's face not reaching its own ledge shadow, exposing it as a gap.
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: spacing.xxxl},
  roleLabel: { paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  roleText: { ...typography.body, color: colors.text.tertiary },
  linkContainer: { alignItems: 'center' },
  // linkText: { color: colors.text.secondary},
  toggleButton: {
    flex: 1,
  }
});