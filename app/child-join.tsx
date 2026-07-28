import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';

export default function ChildJoin() {
  const router = useRouter();
  const [secretCode, setSecretCode] = useState('');

  return (
    <SafeAreaView style={styles.container}>
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
          placeholderTextColor="#BDC4D4"
          autoCorrect={false}
        />

        <TouchableOpacity 
          style={styles.joinButton}
          onPress={() => {
            if(secretCode.length === 7) router.push('/child-dashboard');
          }}
        >
          <Text style={styles.joinButtonText}>join household</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bypassButton} 
          onPress={() => router.push('/child-dashboard')}
        >
          <Text style={styles.bypassText}>skip to camera dashboard</Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  label: { fontSize: 16, fontWeight: '300', marginBottom: 20, color: '#1A234E' },
  codeInput: { 
    width: '100%', 
    borderBottomWidth: 1, 
    borderBottomColor: '#BDC4D4', 
    fontSize: 32, 
    textAlign: 'center', 
    letterSpacing: 5, 
    fontWeight: '200',
    color: '#1A234E'
  },
  joinButton: { backgroundColor: '#FFD700', paddingVertical: 18, width: '100%', borderRadius: 10, marginTop: 40, alignItems: 'center' },
  joinButtonText: { fontWeight: '600', color: '#000' },
  bypassButton: { marginTop: 50 },
  bypassText: { color: '#005DA7', fontSize: 12, fontWeight: '300' }
});