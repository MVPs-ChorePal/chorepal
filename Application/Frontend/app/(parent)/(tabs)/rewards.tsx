//@ts-nocheck
import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import RewardShopItem from '../../../components/parent/RewardShopItem';
import RewardActivityItem from '../../../components/RewardActivityItem';
import CountBadge from '../../../components/CountBadge';
import Button from '../../../components/Button';

// Source of truth: Figma "Parent Rewards"
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=709-145

//formats an ISO date string into something like "Sep 12"
const formatDate = (isoDate) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const capitalizedFirstName = (name) => {
  const first = (name || 'Child').trim().split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

export default function ParentRewards() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState([]);

  // redeem_reward debits points immediately (no parent approval step), so a
  // redemption shows up here as something to hand over. "Mark given" stamps
  // transactions.given_at (mark_reward_given) and drops it off the list.
  // Chore payouts aren't shown - parents already see those on the chores side.
  const [toHandOut, setToHandOut] = useState([]);

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
        //redemptions not handed over yet, oldest first (the longest-waiting
        //kid is at the top)
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('id, user_id, amount, reward_id, created_at')
          .in('user_id', kids.map(k => k.id))
          .eq('type', 'debit')
          .is('given_at', null)
          .order('created_at', { ascending: true });
        if (txError) throw txError;

        //reward names/categories - looked up by id rather than taken from
        //the shop list above, so archived rewards still show their name
        const rewardIds = [...new Set(txData.filter(t => t.reward_id).map(t => t.reward_id))];
        const { data: rewardInfo } = rewardIds.length
          ? await supabase.from('rewards').select('id, title, category').in('id', rewardIds)
          : { data: [] };

        setToHandOut(txData.map(t => {
          const reward = rewardInfo?.find(r => r.id === t.reward_id);
          return {
            ...t,
            childName: capitalizedFirstName(kids.find(k => k.id === t.user_id)?.display_name),
            title: reward?.title || 'Reward',
            category: reward?.category || 'other',
          };
        }));
      } else {
        setToHandOut([]);
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

  //optimistic: drop it off the list right away, put it back if the save fails
  const handleMarkGiven = async (item) => {
    setToHandOut((prev) => prev.filter((t) => t.id !== item.id));
    const { error } = await supabase.rpc('mark_reward_given', { p_transaction_id: item.id });
    if (error) {
      console.error('MARK GIVEN ERROR:', error.message);
      setToHandOut((prev) => [...prev, item].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    }
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
          <View style={styles.sectionHeaderRow}>
            <Text style={{ ...typography.h2 }}>To hand out</Text>
            {toHandOut.length > 0 && <CountBadge count={toHandOut.length} />}
          </View>

          {toHandOut.length === 0 ? (
            <Text style={{...typography.bodyTertiary}}>{"All caught up - rewards your kids redeem show up here"}</Text>
          ) : (
            <View>
              <View pointerEvents="none" style={styles.shopCardLedge} />
              <View style={styles.shopCard}>
                {toHandOut.map((t, i) => (
                  <React.Fragment key={t.id}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <RewardActivityItem
                      title={t.title}
                      subtitle={`${t.childName} · ${formatDate(t.created_at)}`}
                      amount={Number(t.amount)}
                      type="debit"
                      category={t.category}
                      onMarkGiven={() => handleMarkGiven(t)}
                    />
                  </React.Fragment>
                ))}
              </View>
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
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Hard, unblurred offset shadow — same "ledge" technique as Button/KidCard.
  // Shared by the "To hand out" and "Your reward shop" cards.
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
