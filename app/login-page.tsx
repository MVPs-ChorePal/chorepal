import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { supabase } from '../utils/supabase';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('error', 'please enter email and password');
      return;
    }

    setLoading(true);

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      Alert.alert('error', authError.message.toLowerCase());
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Fetch User Profile to determine routing
      const { data: profile, error: dbError } = await supabase
        .from('users')
        .select('role, account_owner_id')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        // SMART ROUTING LOGIC
        if (profile.role === 'parent') {
          router.replace('/parent-dashboard');
        } else if (profile.role === 'child') {
          // If child hasn't joined a family yet, send to join page
          if (!profile.account_owner_id) router.replace('/child-join');
          else router.replace('/child-dashboard');
        }
      } else {
        router.replace('/signup-page');
      }
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <Text style={styles.title}>welcome back</Text>

            <View style={styles.form}>
              <TextInput 
                placeholder="email address" 
                placeholderTextColor="#999"
                style={styles.input} 
                onChangeText={setEmail} 
                value={email} 
                autoCapitalize="none" 
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
                style={styles.mainButton} 
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.mainButtonText}>{loading ? '...' : 'login'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/signup-page')} style={styles.linkContainer}>
              <Text style={styles.linkText}>new here? <Text style={{ color: '#005DA7', fontWeight: '600' }}>sign up</Text></Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
  title: { fontSize: 32, fontWeight: '300', color: '#1A234E', textAlign: 'center', marginBottom: 50, letterSpacing: -1 },
  form: { width: '100%' },
  input: { borderBottomWidth: 1, borderBottomColor: '#BDC4D4', paddingVertical: 15, marginBottom: 20, fontSize: 16, color: '#1A234E' },
  mainButton: { backgroundColor: '#005DA7', paddingVertical: 18, borderRadius: 5, marginTop: 20, alignItems: 'center' },
  mainButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  linkContainer: { marginTop: 30, alignItems: 'center' },
  linkText: { color: '#AAA', fontSize: 14 }
});