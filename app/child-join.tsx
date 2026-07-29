import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function ChildJoin() {
  const router = useRouter();
  const [secretCode, setSecretCode] = useState('');

  const handleJoin = async () => {
    if (secretCode.length !== 7) {
      Alert.alert("error", "code must be 7 characters");
      return;
    }

    console.log("joining household with code:", secretCode);

    //find the parent
    const { data: parent, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('secret_code', secretCode)
      .single();

    if (findError || !parent) {
      Alert.alert("error", "invalid code. check with your parent.");
      return;
    }

    console.log("found parent with id:", parent.id);

    //get the current logged-in child's id
    const { data: { user } } = await supabase.auth.getUser();

    //link the child to that parent
    const { error: linkError } = await supabase
      .from('users')
      .update({ account_owner_id: parent.id })
      .eq('id', user?.id);

    if (linkError) {
      Alert.alert("error", "could not join household");
    } else {
      Alert.alert("success", "welcome to the family!");
      router.replace('/child-dashboard');
    }
  };

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
          onPress={handleJoin}>
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