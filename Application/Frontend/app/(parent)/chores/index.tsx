//@ts-nocheck
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { colors, typography, radius, spacing } from '../../../constants/theme';

const firstName = (name) => (name || 'child').trim().split(' ')[0].toLowerCase();

export default function ParentChoresList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chores, setChores] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('users').select('family_id').eq('id', session.user.id).single();
      if (!profile?.family_id) { setChores([]); return; }

      const { data: familyMembers } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('family_id', profile.family_id)
        .eq('role', 'child');
      const kidIds = familyMembers?.map(k => k.id) || [];

      if (kidIds.length === 0) { setChores([]); return; }

      //unlike home.tsx, this shows the full history - approved chores included
      const { data: rawChores, error } = await supabase
        .from('chores')
        .select('*')
        .in('assigned_to', kidIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChores((rawChores || []).map(c => ({
        ...c,
        childName: firstName(familyMembers.find(k => k.id === c.assigned_to)?.display_name),
      })));
    } catch (e) {
      console.error('fetch chores error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={colors.brand.primary} /></View>;

  const waiting = chores.filter(c => c.status === 'completed');
  const inProgress = chores.filter(c => c.status === 'todo' || c.status === 'pending');
  const approved = chores.filter(c => c.status === 'approved');

  const renderSection = (label, list, { highlight, emptyText } = {}) => (
    <>
      <Text style={styles.sectionTitle}>{label}</Text>
      {list.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : list.map(chore => (
        <TouchableOpacity
          key={chore.id}
          style={[styles.card, highlight && styles.waitingCard]}
          onPress={() => router.push(`/(parent)/chores/${chore.id}`)}
        >
          <View>
            <Text style={styles.choreTitle}>{chore.title}</Text>
            <Text style={styles.choreSub}>{chore.childName} • {chore.status === 'todo' ? 'to-do' : chore.status}</Text>
          </View>
          <Text style={styles.points}>{chore.reward_amount} pts</Text>
        </TouchableOpacity>
      ))}
    </>
  );

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>chores</Text>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        {renderSection('waiting for approval', waiting, { highlight: true, emptyText: 'nothing to approve right now' })}
        {renderSection('in progress', inProgress, { emptyText: 'nothing on the schedule' })}
        {renderSection('approved', approved, { emptyText: 'no approved chores yet' })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(parent)/_layout.tsx).
  root: { flex: 1, gap: spacing.xl },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { ...typography.h2, color: colors.brand.primary, letterSpacing: -1 },
  scroll: { paddingBottom: spacing.xl },
  sectionTitle: { ...typography.body, color: colors.text.primary, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyText: { color: colors.text.tertiary, fontSize: 14, fontWeight: '300' },
  card: { backgroundColor: colors.surface.white, borderRadius: radius.card, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  waitingCard: { borderLeftWidth: 7, borderLeftColor: colors.status.success },
  choreTitle: { ...typography.body, color: colors.text.primary },
  choreSub: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  points: { fontSize: 14, fontWeight: '800', color: colors.brand.primary },
});
