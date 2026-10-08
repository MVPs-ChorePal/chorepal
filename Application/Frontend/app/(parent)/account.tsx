import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'expo-router';
import HouseholdCode from '../../components/household-code';

export default function ParentAccount() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>account</Text>

      <View style={styles.content}>
        <HouseholdCode />
      </View>

      <TouchableOpacity
        onPress={() => supabase.auth.signOut().then(() => router.replace('/login-page'))}
        style={styles.logoutButton}
      >
        <Text style={styles.logoutText}>logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF', padding: 25 },
  title: { fontSize: 24, fontWeight: '300', color: '#005DA7', letterSpacing: -1, marginBottom: 20 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoutButton: { alignItems: 'center', marginBottom: 70 },
  logoutText: { color: '#005DA7', textDecorationLine: 'underline', fontWeight: '300' }
});
