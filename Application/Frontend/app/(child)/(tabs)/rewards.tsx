//@ts-nocheck
import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { showAlert } from '../../../utils/alert';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import RewardTile from '../../../components/RewardTile';
import ChildHeader from '../../../components/ChildHeader';
import Pill from '../../../components/Pill';
import RewardActivityList from '../../../components/RewardActivityList';

//formats an ISO date string into something like "Sep 12"
const formatDate = (isoDate) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Category filter row above the reward grid — "All" plus the 4 reward categories.
const CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'fun', label: 'Fun' },
  { value: 'treats', label: 'Treats' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export default function ChildRewards() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [history, setHistory] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('family_id, current_balance')
        .eq('id', session.user.id)
        .single();
      if (profileError) throw profileError;
      setBalance(Number(profile.current_balance || 0));

      //the store is every reward made by a parent in this household
      if (profile.family_id) {
        const { data: parents, error: parentsError } = await supabase
          .from('users')
          .select('id')
          .eq('family_id', profile.family_id)
          .eq('role', 'parent');
        if (parentsError) throw parentsError;

        const { data: rewardsData, error: rewardsError } = await supabase
          .from('rewards')
          .select('id, title, description, point_cost, category')
          .in('created_by', parents.map(p => p.id))
          .eq('archived', false)
          .order('point_cost', { ascending: true });
        if (rewardsError) throw rewardsError;
        setRewards(rewardsData || []);
      }

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('id, amount, type, chore_id, reward_id, given_at, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (txError) throw txError;

      //look up the chore/reward names for the history list
      const choreIds = [...new Set(txData.filter(t => t.chore_id).map(t => t.chore_id))];
      const rewardIds = [...new Set(txData.filter(t => t.reward_id).map(t => t.reward_id))];
      const [{ data: choreNames }, { data: rewardNames }] = await Promise.all([
        choreIds.length ? supabase.from('chores').select('id, title').in('id', choreIds) : { data: [] },
        rewardIds.length ? supabase.from('rewards').select('id, title, category').in('id', rewardIds) : { data: [] },
      ]);

      setHistory(txData.map(t => {
        const reward = rewardNames?.find(r => r.id === t.reward_id);
        return {
          ...t,
          label: t.type === 'credit'
            ? choreNames?.find(c => c.id === t.chore_id)?.title || 'Chore'
            : reward?.title || 'Reward',
          category: reward?.category || 'other', //sets the row's tile color/icon
        };
      }));
    } catch (e) {
      console.error('FETCH REWARDS ERROR:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  //refetch every time the tab comes into focus, so newly approved chores show up
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredRewards = rewards.filter(
    (reward) => categoryFilter === 'all' || reward.category === categoryFilter
  );

  const handleRedeem = async (reward) => {
    setRedeemingId(reward.id);
    const { data: newBalance, error } = await supabase.rpc('redeem_reward', { p_reward_id: reward.id });
    setRedeemingId(null);

    if (error) {
      showAlert('error', error.message.toLowerCase());
      return;
    }
    setBalance(Number(newBalance));
    showAlert('redeemed!', `enjoy your ${reward.title.toLowerCase()}`);
    fetchData();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        <ChildHeader left={`Reward shop`} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORY_FILTERS.map(({ value, label }) => (
            <Pill
              key={value}
              selected={categoryFilter === value}
              onPress={() => setCategoryFilter(value)}
            >
              {label}
            </Pill>
          ))}
        </ScrollView>

        {filteredRewards.length === 0 ? (
          <Text style={{...typography.bodySecondary}}>No rewards yet. Ask your parent to add some!</Text>
        ) : (
          <View style={styles.rewardGrid}>
            {filteredRewards.map(reward => {
              const cost = Number(reward.point_cost);
              const canAfford = balance >= cost;
              return (
                <RewardTile
                  key={reward.id}
                  title={reward.title}
                  cost={cost}
                  category={reward.category}
                  canAfford={canAfford}
                  shortfall={cost - balance}
                  onPress={() => handleRedeem(reward)}
                  loading={redeemingId === reward.id}
                  disabled={redeemingId !== null}
                  style={styles.rewardTile}
                />
              );
            })}
          </View>
        )}

        <Text style={{...typography.h2}}>History</Text>
        {history.length === 0 ? (
          <Text style={{...typography.bodySecondary}}>Points you earn and spend will show up here</Text>
        ) : (
          <RewardActivityList
            items={history.map((t) => ({
              id: t.id,
              title: t.label,
              subtitle: formatDate(t.created_at),
              amount: Number(t.amount),
              type: t.type === 'credit' ? 'credit' : 'debit',
              category: t.category,
              //redeemed rewards: has the parent handed it over yet?
              //(given_at is set by the parent's "Mark given")
              status: t.type === 'debit'
                ? (t.given_at ? { label: 'Given', done: true } : { label: 'On its way', done: false })
                : undefined,
            }))}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(child)/_layout.tsx).
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },
  title: { ...typography.display},
  balanceCard: { backgroundColor: colors.brand.primary, borderRadius: radius.medium, padding: 25, alignItems: 'center' },
  balanceLabel: { ...typography.body, color: colors.text.inverse, textTransform: 'uppercase' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  balanceValue: { fontSize: 44, fontWeight: '800', color: colors.text.inverse },
  sectionTitle: { ...typography.body, color: colors.text.secondary, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  rewardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.lg },
  rewardTile: { width: '48%' },
});
