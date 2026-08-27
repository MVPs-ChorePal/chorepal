import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../../utils/supabase';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(parent)/chores/create-chore')}>
            <Ionicons name="add" size={32} color="#FFF" />
          </TouchableOpacity>
        
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
  fab: { position: 'absolute', right: 30, bottom: 100, backgroundColor: '#005DA7', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.8, },
});