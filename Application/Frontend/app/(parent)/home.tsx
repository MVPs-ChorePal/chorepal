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
import { colors, typography, radius, spacing } from '../../constants/theme';

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

  //realtime listener to keep dashboard updated, instead of polling
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brand.primary} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
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
                <Ionicons name="chevron-forward" size={20} color={colors.icon.secondary} />
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
        <Ionicons name="add" size={32} color={colors.icon.inverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(parent)/_layout.tsx).
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },
  title: { ...typography.h2, color: colors.text.primary, letterSpacing: -0.5 },
  sectionTitle: { ...typography.captionStrong, color: colors.text.primary, textTransform: 'uppercase' },
  emptyText: { color: colors.text.tertiary, fontSize: 14, fontWeight: '300' },
  card: { backgroundColor: colors.surface.white, borderRadius: radius.card, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waitingCard: { borderLeftWidth: 7, borderLeftColor: colors.status.success },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
  choreTitle: { ...typography.bodyMediumStrong, color: colors.text.primary },
  childName: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  points: { fontSize: 14, fontWeight: '800', color: colors.brand.primary },
  fab: { position: 'absolute', bottom: spacing.xl, right: 25, width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.brand.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
});