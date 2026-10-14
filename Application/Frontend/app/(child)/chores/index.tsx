//@ts-nocheck
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../utils/supabase';
import { colors, typography, radius, spacing } from '../../../constants/theme';

export default function ChildChoresList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chores, setChores] = useState([]);

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

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={colors.brand.primary} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>chores</Text>
      <FlatList
        data={chores}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/chores/${item.id}`)}>
            <View style={styles.cardLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="flash-outline" size={20} color={colors.brand.primary} />
              </View>
              <View>
                <Text style={styles.choreName}>{item.title.toLowerCase()}</Text>
                <Text style={styles.choreReward}>{item.reward_amount} pts</Text>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              item.status === 'pending' && { backgroundColor: colors.status.warningSubtle },
              (item.status === 'approved' || item.status === 'completed') && { backgroundColor: colors.status.successSubtle },
            ]}>
              <Text style={[
                styles.statusText,
                item.status === 'pending' && { color: colors.status.warningText },
                (item.status === 'approved' || item.status === 'completed') && { color: colors.status.successText },
              ]}>
                {item.status === 'todo' ? 'to-do' : item.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>no chores yet</Text>
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
  title: { ...typography.h2, color: colors.brand.primary, letterSpacing: -1 },
  list: { paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface.white,
    borderRadius: radius.card,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 45, height: 45, borderRadius: radius.full, backgroundColor: colors.surface.neutral, justifyContent: 'center', alignItems: 'center' },
  choreName: { ...typography.bodyMediumStrong, color: colors.text.primary },
  choreReward: { fontSize: 13, color: colors.brand.primary, fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.small, backgroundColor: colors.surface.neutral },
  statusText: { ...typography.captionStrong, color: colors.brand.primary, textTransform: 'uppercase' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: colors.text.tertiary, fontWeight: '300' },
});
