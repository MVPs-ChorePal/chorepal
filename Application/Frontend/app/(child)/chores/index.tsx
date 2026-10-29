//@ts-nocheck
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../utils/supabase';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import Chore from '../../../components/Chore';
import Category, { CategoryValue } from '../../../components/Category';
import StatusTabs, { StatusTab } from '../../../components/StatusTabs';
import { CATEGORY_AI_TAGS, categoryForTag } from '../../../constants/choreCategories';
import ChildHeader from '../../../components/ChildHeader';

// Matches the Figma "Category Filter" component — All plus the 3 filterable
// buckets (Other has no dedicated filter chip).
const FILTERS: CategoryValue[] = ['all', 'clean', 'kitchen', 'outdoor'];

type StatusFilter = 'todo' | 'pending' | 'done';
const STATUS_TABS: StatusTab<StatusFilter>[] = [
  { value: 'todo', label: 'To do' },
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Done' },
];

export default function ChildChoresList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chores, setChores] = useState([]);
  const [filter, setFilter] = useState<CategoryValue>('all');
  const [status, setStatus] = useState<StatusFilter>('todo');

  //unlike home.tsx (which only shows what's not yet approved), this is the
  //full history, approved chores included, so a kid can see what they've done
  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('assigned_to', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChores(data || []);
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
    .filter((c) => (status === 'done' ? c.status === 'completed' || c.status === 'approved' : c.status === status));

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={colors.brand.primary} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <ChildHeader left={`Chores`} style={{...typography.h1}}/>
      <View style={styles.filterRow}>
        {FILTERS.map((cat) => (
          <Category key={cat} value={cat} selected={filter === cat} onPress={() => setFilter(cat)} />
        ))}
      </View>
      <StatusTabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
      <View>
        <Text style={{ ...typography.h2 }}>Today</Text>
      </View>
      <FlatList
        data={filteredChores}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/chores/${item.id}`)}>
              <Chore
                  title={item.title}
                  reward_amount={item.reward_amount}
                  status={item.status}
                  category={item.category}
                  onPress={() => router.push(`/chores/${item.id}`)}
              />

          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{...typography.bodyTertiary}}>No chores yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(child)/_layout.tsx).
  root: { flex: 1, gap: spacing.xl },
  center: { justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: 10 },
  title: { ...typography.display },
  list: { paddingBottom: spacing.xl },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: colors.text.tertiary, fontWeight: '300' },
});
