//@ts-nocheck
import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { showAlert } from '../../utils/alert';
import { colors, typography, radius, spacing } from '../../constants/theme';
import Button from '../../components/Button';

//formats an ISO date string into something like "sep 12"
const formatDate = (isoDate) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();

export default function ChildRewards() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [history, setHistory] = useState([]);

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
          .select('id, title, description, point_cost')
          .in('created_by', parents.map(p => p.id))
          .eq('archived', false)
          .order('point_cost', { ascending: true });
        if (rewardsError) throw rewardsError;
        setRewards(rewardsData || []);
      }

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('id, amount, type, chore_id, reward_id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (txError) throw txError;

      //look up the chore/reward names for the history list
      const choreIds = [...new Set(txData.filter(t => t.chore_id).map(t => t.chore_id))];
      const rewardIds = [...new Set(txData.filter(t => t.reward_id).map(t => t.reward_id))];
      const [{ data: choreNames }, { data: rewardNames }] = await Promise.all([
        choreIds.length ? supabase.from('chores').select('id, title').in('id', choreIds) : { data: [] },
        rewardIds.length ? supabase.from('rewards').select('id, title').in('id', rewardIds) : { data: [] },
      ]);

      setHistory(txData.map(t => ({
        ...t,
        label: t.type === 'credit'
          ? choreNames?.find(c => c.id === t.chore_id)?.title || 'chore'
          : rewardNames?.find(r => r.id === t.reward_id)?.title || 'reward',
      })));
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
        <Text style={styles.title}>Rewards</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>your points</Text>
          <View style={styles.balanceRow}>
            <Ionicons name="star" size={28} color={colors.icon.inverse} />
            <Text style={styles.balanceValue}>{balance}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>store</Text>
        {rewards.length === 0 ? (
          <Text style={styles.emptyText}>no rewards yet. ask your parent to add some!</Text>
        ) : rewards.map(reward => {
          const cost = Number(reward.point_cost);
          const canAfford = balance >= cost;
          return (
            <View key={reward.id} style={styles.card}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.cardTitle}>{reward.title.toLowerCase()}</Text>
                {!!reward.description && <Text style={styles.cardSub}>{reward.description}</Text>}
                {!canAfford && <Text style={styles.cardSub}>{cost - balance} more pts needed</Text>}
              </View>
              <Button
                title={`${cost} pts`}
                size="small"
                onPress={() => handleRedeem(reward)}
                disabled={!canAfford || redeemingId !== null}
                loading={redeemingId === reward.id}
                style={styles.redeemBtn}
              />
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>history</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>points you earn and spend will show up here</Text>
        ) : (
          <View style={styles.historyCard}>
            {history.map((t, i) => {
              const isCredit = t.type === 'credit';
              return (
                <View key={t.id} style={[styles.historyRow, i > 0 && styles.rowDivider]}>
                  <Ionicons
                    name={isCredit ? 'checkmark-circle' : 'gift'}
                    size={20}
                    color={isCredit ? colors.status.success : colors.status.pending}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.historyLabel}>{t.label.toLowerCase()}</Text>
                    <Text style={styles.historyDate}>{formatDate(t.created_at)}</Text>
                  </View>
                  <Text style={[styles.historyAmount, { color: isCredit ? colors.status.success : colors.text.primary }]}>
                    {isCredit ? '+' : '-'}{Number(t.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
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
  emptyText: { color: colors.text.tertiary, fontWeight: '300' },
  card: { backgroundColor: colors.surface.white, borderRadius: radius.card, padding: 20, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { ...typography.body, color: colors.text.primary },
  cardSub: { fontSize: 12, color: colors.text.secondary, marginTop: 3 },
  redeemBtn: { minWidth: 80 },
  historyCard: { backgroundColor: colors.surface.white, borderRadius: radius.card, paddingHorizontal: 20, paddingVertical: 5 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border.default },
  historyLabel: { ...typography.body, color: colors.text.primary },
  historyDate: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '800' },
});
