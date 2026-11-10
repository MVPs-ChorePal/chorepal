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
import RewardRequestCard from '../../../components/parent/RewardRequestCard';
import RewardShopItem from '../../../components/parent/RewardShopItem';
import Button from '../../../components/Button';

// Source of truth: Figma "Parent Rewards"
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=709-145

// Rotating palette so each child's avatar reads as a distinct color, same
// cycling tones used for Parent Home's KidCard and New Chore's child picker.
const KID_TONES = [colors.category.kitchen, colors.category.clean, colors.category.outdoor, colors.category.other];

export default function ParentRewards() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState([]);

  // There's no "reward request" table yet (schema.sql's redeem_reward flow
  // debits points immediately, no parent approval step) — these requests are
  // local-only for now, same as create-chore's "steps" field.
  const [requests, setRequests] = useState([
    { id: 1, childName: 'Mia', avatarColor: KID_TONES[0].base, rewardTitle: 'Extra screen time', cost: 3000 },
  ]);
  const [respondingId, setRespondingId] = useState(null);

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
    } catch (e) {
      console.error('FETCH REWARDS ERROR:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  //refetch every time the tab comes into focus, so new submissions show up
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  //UI-only until a real approval flow exists — just drops the request locally
  const respondToRequest = (id) => {
    setRespondingId(id);
    setTimeout(() => {
      setRequests(prev => prev.filter(r => r.id !== id));
      setRespondingId(null);
    }, 300);
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
          <View style={styles.requestsHeaderRow}>
            <Text style={{ ...typography.h2 }}>Requests</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{requests.length}</Text>
            </View>
          </View>

          {requests.length === 0 ? (
            <Text style={{...typography.bodyTertiary}}>No requests right now</Text>
          ) : (
            requests.map(request => (
              <RewardRequestCard
                key={request.id}
                childName={request.childName}
                avatarColor={request.avatarColor}
                rewardTitle={request.rewardTitle}
                cost={request.cost}
                loading={respondingId === request.id}
                onAccept={() => respondToRequest(request.id)}
                onDecline={() => respondToRequest(request.id)}
              />
            ))
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
  requestsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  countBadge: { backgroundColor: colors.brand.primary, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { ...typography.body, fontSize: 16, color: colors.text.inverse },
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
