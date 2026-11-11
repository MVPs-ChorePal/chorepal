//@ts-nocheck
import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../utils/supabase';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import RewardShopItem from '../../../components/parent/RewardShopItem';
import Button from '../../../components/Button';

// Source of truth: Figma "Parent Rewards"
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=709-145

//formats an ISO date string into something like "sep 12"
const formatDate = (isoDate) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();

export default function ParentRewards() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState([]);

  // redeem_reward debits points immediately (no parent approval step), so
  // this is a read-only log of what already happened, not pending requests -
  // both chore payouts and reward redemptions, most recent first, same as
  // the child's own rewards.tsx history.
  const [activity, setActivity] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', session.user.id)
        .single();
      if (profileError) throw profileError;
      if (!profile.family_id) return;

      //the shop is every reward made by a parent in this household
      const { data: parents, error: parentsError } = await supabase
        .from('users')
        .select('id')
        .eq('family_id', profile.family_id)
        .eq('role', 'parent');
      if (parentsError) throw parentsError;

      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('id, title, point_cost, category')
        .in('created_by', parents.map(p => p.id))
        .eq('archived', false)
        .order('point_cost', { ascending: true });
      if (rewardsError) throw rewardsError;
      setRewards(rewardsData || []);

      const { data: kids, error: kidsError } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('family_id', profile.family_id)
        .eq('role', 'child');
      if (kidsError) throw kidsError;

      if (kids.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('id, user_id, amount, type, chore_id, reward_id, created_at')
          .in('user_id', kids.map(k => k.id))
          .order('created_at', { ascending: false })
          .limit(20);
        if (txError) throw txError;

        //look up the chore/reward names for the activity labels, same
        //pattern as the child's own rewards.tsx history
        const choreIds = [...new Set(txData.filter(t => t.chore_id).map(t => t.chore_id))];
        const rewardIds = [...new Set(txData.filter(t => t.reward_id).map(t => t.reward_id))];
        const [{ data: choreNames }, { data: rewardNames }] = await Promise.all([
          choreIds.length ? supabase.from('chores').select('id, title').in('id', choreIds) : { data: [] },
          rewardIds.length ? supabase.from('rewards').select('id, title').in('id', rewardIds) : { data: [] },
        ]);

        setActivity(txData.map(t => ({
          ...t,
          childName: (kids.find(k => k.id === t.user_id)?.display_name || 'Child').trim().split(' ')[0],
          label: t.type === 'credit'
            ? choreNames?.find(c => c.id === t.chore_id)?.title || 'chore'
            : rewardNames?.find(r => r.id === t.reward_id)?.title || 'reward',
        })));
      } else {
        setActivity([]);
      }
    } catch (e) {
      console.error('FETCH REWARDS ERROR:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  //refetch every time the tab comes into focus, so new activity shows up
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const goToEditReward = (reward) => {
    router.push({
      pathname: '/(parent)/rewards/create-reward',
      params: { id: reward.id, title: reward.title, cost: String(reward.point_cost), category: reward.category || 'other' },
    });
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
        <Text style={{ ...typography.display }}>Rewards</Text>

        <View style={styles.fieldGroup}>
          <Text style={{ ...typography.h2 }}>Recent activity</Text>

          {activity.length === 0 ? (
            <Text style={{...typography.bodyTertiary}}>Nothing yet - completed chores and reward redemptions show up here</Text>
          ) : (
            <View style={styles.activityCard}>
              {activity.map((t, i) => {
                const isCredit = t.type === 'credit';
                return (
                  <React.Fragment key={t.id}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <View style={styles.activityRow}>
                      <Ionicons
                        name={isCredit ? 'checkmark-circle' : 'gift'}
                        size={20}
                        color={isCredit ? colors.status.success : colors.status.pending}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={typography.body} numberOfLines={1}>{t.childName} · {t.label.toLowerCase()}</Text>
                        <Text style={styles.activityDate}>{formatDate(t.created_at)}</Text>
                      </View>
                      <Text style={[styles.activityAmount, { color: isCredit ? colors.status.success : colors.text.primary }]}>
                        {isCredit ? '+' : '-'}{Number(t.amount)}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.h2 }}>Your reward shop</Text>
          <Text style={{ ...typography.bodySecondary }}>What your kids can spend coins on</Text>
        </View>
        
        {rewards.length === 0 ? (
          <Text style={{ ...typography.bodyTertiary }}>No rewards yet. Add one below!</Text>
        ) : (
          <View>
            <View pointerEvents="none" style={styles.shopCardLedge} />
            <View style={styles.shopCard}>
              {rewards.map((reward, i) => (
                <React.Fragment key={reward.id}>
                  {i > 0 && <View style={styles.rowDivider} />}
                  <RewardShopItem
                    title={reward.title}
                    cost={Number(reward.point_cost)}
                    category={reward.category}
                    onEdit={() => goToEditReward(reward)}
                  />
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        <Button title="+ Add a reward" onPress={() => router.push('/(parent)/rewards/create-reward')} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(parent)/_layout.tsx).
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },
  fieldGroup: { gap: spacing.lg },
  activityCard: { backgroundColor: colors.surface.white, borderRadius: radius.card, paddingHorizontal: 20, paddingVertical: 5 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  activityDate: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  activityAmount: { fontSize: 15, fontWeight: '800' },
  // Hard, unblurred offset shadow — same "ledge" technique as Button/KidCard.
  shopCardLedge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 5 }],
  },
  shopCard: {
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  rowDivider: { height: 2, backgroundColor: colors.border.default },
});
