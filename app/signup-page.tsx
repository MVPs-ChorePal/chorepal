import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, Keyboard 
} from 'react-native';
import { supabase } from '../utils/supabase';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('error', 'please fill all fields');
      return;
    }
    setLoading(true);
    //converts full name to username by removing spaces and lowercasing
    const username = fullName.toLowerCase().replace(/\s/g, "");

    //sign up with supabase auth and insert into users table
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      Alert.alert('error', authError.message.toLowerCase());
      setLoading(false);
      return;
    }

    //insert into users table with info
    if (authData.user) {
      const secretCode = role === 'parent' ? generateSecretCode() : null; //only generate code for parents
      const { error: dbError } = await supabase.from('users').insert([
        { id: authData.user.id, secret_code: secretCode, username, role, current_balance: 0 }
      ]);

      //if error, show alert, else navigate to dashboard
      if (dbError) {
        Alert.alert('error', dbError.message.toLowerCase());
        setLoading(false);
      } else {
        setTimeout(() => {
          setLoading(false);
          if (role === 'parent') router.replace('/parent-dashboard');
          else router.replace('/child-join');
        }, 1000);
      }
    }
  };

  const isParent = role === 'parent';
  const accentColor = isParent ? '#005DA7' : '#FFD700'; 
  const btnText = isParent ? '#FFFFFF' : '#000000';

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
            placeholderTextColor="#999"
            style={styles.input} 
            onChangeText={setFullName} 
            value={fullName}
            autoCapitalize="none"
          />
          <TextInput 
            placeholder="email address" 
            placeholderTextColor="#999"
            style={styles.input} 
            onChangeText={setEmail} 
            value={email} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />
          <TextInput 
            placeholder="password" 
            placeholderTextColor="#999"
            style={styles.input} 
            onChangeText={setPassword} 
            value={password} 
            secureTextEntry 
            autoCapitalize="none"
          />

          <TouchableOpacity 
            style={[styles.mainButton, { backgroundColor: accentColor }]} 
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={[styles.mainButtonText, { color: btnText }]}>
              {loading ? '...' : 'sign up'}
            </Text>
          </TouchableOpacity>
        </View>

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

          <TouchableOpacity onPress={() => router.push('/login-page')} style={{ marginTop: 50, alignItems: 'center' }}>
            <Text style={{ color: '#AAA', fontSize: 14 }}>
              already have an account? <Text style={{ color: '#005DA7', fontWeight: '600' }}>login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
  headerArea: { marginBottom: 50 },
  title: { fontSize: 32, fontWeight: '300', color: '#1A234E', textAlign: 'center', letterSpacing: -1 },
  form: { width: '100%' },
  input: { borderBottomWidth: 1, borderBottomColor: '#BDC4D4', paddingVertical: 15, marginBottom: 20, fontSize: 16, color: '#1A234E' },
  mainButton: { paddingVertical: 18, borderRadius: 5, marginTop: 20, alignItems: 'center' },
  mainButtonText: { fontWeight: '600', fontSize: 16, letterSpacing: 0.5 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 60, gap: 30 },
  roleLabel: { paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  roleText: { fontSize: 14, color: '#AAA', fontWeight: '500' }
});