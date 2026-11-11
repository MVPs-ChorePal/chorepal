//@ts-nocheck
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../../utils/supabase';
import { colors, typography, spacing } from '../../../../constants/theme';
import Chore from '../../../../components/parent/Chore';
import ParentHeader from '../../../../components/parent/ParentHeader';
import Category, { CategoryValue } from '../../../../components/Category';
import StatusTabs, { StatusTab } from '../../../../components/StatusTabs';
import { CATEGORY_AI_TAGS, categoryForTag } from '../../../../constants/choreCategories';

// Matches the Figma "Category Filter" component — All plus the 3 filterable
// buckets (Other has no dedicated filter chip). Same component/filter set as
// the child Chores screen; here it filters across every kid's chores.
const FILTERS: CategoryValue[] = ['all', 'clean', 'kitchen', 'outdoor'];

// A parent's 3 meaningful groupings are different from a child's (todo/pending/
// done): a parent mostly cares about what needs their OK vs. what's still in
// progress vs. what's already settled. Same statuses the un-styled version of
// this screen already grouped by (see git history) — just presented as tabs.
type StatusFilter = 'approval' | 'progress' | 'done';
const STATUS_TABS: StatusTab<StatusFilter>[] = [
  { value: 'approval', label: 'To approve' },
  { value: 'progress', label: 'In progress' },
  { value: 'done', label: 'Approved' },
];

const EMPTY_COPY: Record<StatusFilter, string> = {
  approval: 'Nothing to approve right now',
  progress: 'Nothing on the schedule',
  done: 'No approved chores yet',
};

// Capitalized first name ("mario lopez" -> "Mario") for the chore card label.
const firstName = (name) => {
  const first = (name || 'Child').trim().split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

export default function ParentChoresList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chores, setChores] = useState([]);
  const [filter, setFilter] = useState<CategoryValue>('all');
  const [status, setStatus] = useState<StatusFilter>('approval');

  //unlike home.tsx (which only shows what's not yet approved), this is the
  //full history, approved chores included, so a parent can see what's done
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

  const filteredChores = chores
    .filter((c) => filter === 'all' || c.target_label === CATEGORY_AI_TAGS[filter])
    .filter((c) => {
      if (status === 'approval') return c.status === 'completed';
      if (status === 'progress') return c.status === 'todo' || c.status === 'pending';
      return c.status === 'approved';
    });

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={colors.brand.primary} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <ParentHeader left="Chores" />
      <View style={styles.filterRow}>
        {FILTERS.map((cat) => (
          <Category key={cat} value={cat} selected={filter === cat} onPress={() => setFilter(cat)} />
        ))}
      </View>
      <StatusTabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
      <FlatList
        data={filteredChores}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        renderItem={({ item }) => (
          <Chore
            title={item.title}
            reward_amount={item.reward_amount}
            child_name={item.childName}
            status={item.status}
            category={categoryForTag(item.target_label)}
            onPress={() => router.push(`/(parent)/chores/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ ...typography.bodyTertiary }}>{EMPTY_COPY[status]}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(parent)/(tabs)/_layout.tsx).
  root: { flex: 1, gap: spacing.xl },
  center: { justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: 10 },
  list: { paddingBottom: spacing.xl, gap: spacing.xl },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
});
