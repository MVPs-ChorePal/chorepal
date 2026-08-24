import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../../utils/supabase';
import { useRouter, Stack } from 'expo-router';

export default function ParentDashboard() {
  const router = useRouter();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.mainWrapper}>
        <Text style={styles.title}>parent dashboard</Text>
        
        <View style={styles.content}>
          <Text style={styles.placeholderText}>blankity blank</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  mainWrapper: { flex: 1, padding: 40, justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '300', letterSpacing: -1, marginTop: 20 },
  content: { flex: 1, justifyContent: 'center' },
  placeholderText: { color: '#AAA', fontWeight: '200' },
  logoutButton: { marginBottom: 20 },
  logoutText: { color: '#AAA', textDecorationLine: 'underline', fontWeight: '300' }
});