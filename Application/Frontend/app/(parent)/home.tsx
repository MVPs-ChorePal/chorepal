//@ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  ActivityIndicator, RefreshControl 
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const firstName = (name) => (name || 'child').trim().split(' ')[0].toLowerCase();

export default function ParentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [submissions, setSubmissions] = useState([]); 
  const [dueToday, setDueToday] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('users').select('family_id').eq('id', session.user.id).single();
      if (!profile?.family_id) return;

      //fetch family members to get child names
      const { data: familyMembers } = await supabase.from('users').select('id, display_name').eq('family_id', profile.family_id).eq('role', 'child');
      const kidIds = familyMembers?.map(k => k.id) || [];

      if (kidIds.length > 0) {
        const { data: rawChores, error: choresError } = await supabase
          .from('chores')
          .select('*')
          .in('assigned_to', kidIds)
          .neq('status', 'approved')
          .order('created_at', { ascending: false });

        if (choresError) throw choresError;
        const allChores = rawChores || [];

        //filter into two sections
        const waiting = allChores.filter(c => c.status === 'completed');
        const todo = allChores.filter(c => c.status === 'todo' || c.status === 'pending');

        setSubmissions(waiting.map(c => ({
          ...c,
          childName: firstName(familyMembers.find(k => k.id === c.assigned_to)?.display_name)
        })));
        
        setDueToday(todo.map(c => ({
          ...c,
          childName: firstName(familyMembers.find(k => k.id === c.assigned_to)?.display_name)
        })));

      } else {
        setSubmissions([]);
        setDueToday([]);
      }
    } catch (e) {
      console.error("fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  //heartbeat to keep dashboard updated every second
  useEffect(() => {
    const interval = setInterval(() => { fetchData(); }, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#005DA7" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#005DA7" />}
      >
        <Text style={styles.title}>parent dashboard</Text>

        {/* chores waiting for manual parent approval */}
        <Text style={styles.sectionTitle}>waiting for approval</Text>
        {submissions.length === 0 ? <Text style={styles.emptyText}>nothing to approve right now</Text> : 
          submissions.map(chore => (
            <TouchableOpacity 
              key={chore.id} 
              style={[styles.card, styles.waitingCard]}
              onPress={() => router.push(`/(parent)/chores/${chore.id}`)}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.choreTitle}>{chore.title}</Text>
                  <Text style={styles.childName}>{chore.childName} • {chore.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#BDC4D4" />
              </View>
            </TouchableOpacity>
          ))
        }

        {/* chores currently in progress or not started */}
        <Text style={styles.sectionTitle}>due today</Text>
        {dueToday.length === 0 ? <Text style={styles.emptyText}>nothing on the schedule</Text> : 
          dueToday.map(chore => (
            <View key={chore.id} style={styles.card}>
               <View>
                 <Text style={styles.choreTitle}>{chore.title}</Text>
                 <Text style={styles.childName}>
                    {chore.childName} • {chore.status === 'pending' ? 'in progress' : 'to-do'}
                 </Text>
               </View>
               <Text style={styles.points}>{chore.reward_amount} pts</Text>
            </View>
          ))
        }
      </ScrollView>

      {/* button to open chore creator */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/chores/create-chore')}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 150 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A234E', letterSpacing: -0.5, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#1A234E', textTransform: 'uppercase', marginTop: 30, marginBottom: 15 },
  emptyText: { color: '#BDC4D4', fontSize: 14, fontWeight: '300' },
  card: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waitingCard: { borderLeftWidth: 7, borderLeftColor: '#339d39' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
  choreTitle: { fontSize: 16, fontWeight: '700', color: '#1A234E' },
  childName: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  points: { fontSize: 14, fontWeight: '800', color: '#005DA7' },
  fab: { position: 'absolute', bottom: 120, right: 25, width: 64, height: 64, borderRadius: 32, backgroundColor: '#005DA7', justifyContent: 'center', alignItems: 'center', elevation: 5 },
});