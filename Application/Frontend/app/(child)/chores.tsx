import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';

//formats an ISO date string into something like "sep 12"
const formatDueDate = (isoDate: string | null) => {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function ChildChores() {
  const [chores, setChores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChores = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('chores')
        .select('id, title, description, status, reward_amount, due_date, target_label')
        .eq('assigned_to', session.user.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setChores(data || []);
    } catch (e: any) {
      console.error('FETCH CHORES ERROR:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  //refetch every time the tab comes into focus, so newly assigned chores show up
  useFocusEffect(
    useCallback(() => {
      fetchChores();
    }, [fetchChores])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchChores();
  };

  const pendingChores = chores.filter(c => c.status === 'pending');
  const otherChores = chores.filter(c => c.status !== 'pending');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>chores</Text>

      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator color="#FFD700" />
        </View>
      ) : chores.length === 0 ? (
        <View style={styles.content}>
          <Text style={styles.placeholder}>tasks will appear here</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}
        >
          {pendingChores.map(chore => (
            <View key={chore.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{chore.title}</Text>
                <View style={styles.rewardPill}>
                  <Ionicons name="star" size={12} color="#000" />
                  <Text style={styles.rewardText}>{chore.reward_amount}</Text>
                </View>
              </View>

              {!!chore.description && (
                <Text style={styles.cardDescription} numberOfLines={2}>{chore.description}</Text>
              )}

              {chore.due_date && (
                <View style={styles.dueRow}>
                  <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
                  <Text style={styles.dueText}>due {formatDueDate(chore.due_date)}</Text>
                </View>
              )}
            </View>
          ))}

          {otherChores.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>completed</Text>
              {otherChores.map(chore => (
                <View key={chore.id} style={[styles.card, styles.cardDone]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, styles.textDone]}>{chore.title}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#8E8E93" />
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF', padding: 25 },
  title: { fontSize: 24, fontWeight: '300', color: '#FFD700', letterSpacing: -1, marginBottom: 10 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#BDC4D4', fontWeight: '300' },
  list: { paddingBottom: 130, paddingTop: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#8E8E93', textTransform: 'uppercase', marginTop: 10, marginBottom: 15 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 25, padding: 20, marginBottom: 15 },
  cardDone: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A234E', flex: 1, marginRight: 10 },
  textDone: { textDecorationLine: 'line-through' },
  rewardPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD700', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  rewardText: { fontWeight: '800', color: '#000', fontSize: 12 },
  cardDescription: { color: '#8E8E93', fontSize: 13, marginTop: 8, lineHeight: 18 },
  dueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  dueText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
});
