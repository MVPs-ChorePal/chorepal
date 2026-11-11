//@ts-nocheck
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { IconLock, IconLogout2, IconStar } from '@tabler/icons-react-native';
import { supabase } from '../../../utils/supabase';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import HouseholdCode from '../../../components/household-code';
import KidRow from '../../../components/parent/KidRow';
import SettingsCard from '../../../components/SettingsCard';


// Rotating palette so each kid's avatar reads as a distinct color - same
// convention as Parent Home's KidCard and New Chore's child picker.
const KID_TONES = [colors.category.kitchen, colors.category.clean, colors.category.outdoor, colors.category.other];

const capitalizedFirstName = (name) => {
  const first = (name || 'Child').trim().split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

export default function ParentAccount() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kids, setKids] = useState([]);

  const fetchKids = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('users').select('family_id').eq('id', session.user.id).single();
      if (!profile?.family_id) return;

      const { data: familyMembers, error } = await supabase
        .from('users')
        .select('id, display_name, current_balance')
        .eq('family_id', profile.family_id)
        .eq('role', 'child');
      if (error) throw error;

      setKids((familyMembers || []).map((member, index) => ({
        id: member.id,
        name: capitalizedFirstName(member.display_name),
        avatarColor: KID_TONES[index % KID_TONES.length].base,
        balance: Number(member.current_balance) || 0,
      })));
    } catch (e) {
      console.error('FETCH KIDS ERROR:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchKids(); }, [fetchKids]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchKids();
  };

  // dismissAll first (only when there's actually something to dismiss -
  // calling it with nothing pushed logs a dev-only "POP_TO_TOP not handled"
  // warning) - replace only swaps the current top screen, leaving anything
  // pushed underneath (e.g. a chore review reached from the chores list)
  // frozen in this group's own nested stack. Logging back in and navigating
  // to a chore could then resurrect that stale frozen instance instead of a
  // fresh one, rather than a clean login.
  const handleLogout = () => supabase.auth.signOut().then(() => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login-page');
  });

  // Reuses the forgot-password flow (emailed code -> new password), with the
  // parent's email pre-filled. getSession() is async, so the email has to be
  // awaited before navigating. push (not replace) so back returns here.
  const handleChangePassword = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    router.push({
      pathname: '/forgot-password',
      params: { role: 'parent', email: session?.user?.email ?? '' },
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        <Text style={typography.display}>Account</Text>

        <HouseholdCode />

        <Text style={typography.h2}>My kids</Text>

        {loading ? (
          <ActivityIndicator color={colors.brand.primary} />
        ) : kids.length === 0 ? (
          <Text style={typography.bodyTertiary}>No kids have joined your family yet</Text>
        ) : (
          <View>
            <View pointerEvents="none" style={styles.cardLedge} />
            <View style={styles.card}>
              {kids.map((kid, i) => (
                <React.Fragment key={kid.id}>
                  {i > 0 && <View style={styles.rowDivider} />}
                  <KidRow name={kid.name} avatarColor={kid.avatarColor} balance={kid.balance} />
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        <SettingsCard
          items={[
            {
              icon: <IconStar size={20} color={colors.brand.primary} />,
              iconBg: colors.brand.primarySubtle,
              label: 'Edit profile',
              onPress: () => router.push('/(parent)/account/edit-profile'),
            },
            {
              icon: <IconLock size={20} color={colors.category.other.base} />,
              iconBg: colors.category.other.subtle,
              label: 'Change password',
              onPress: handleChangePassword,
            },
            {
              icon: <IconLogout2 size={20} color={colors.text.secondary} />,
              iconBg: 'rgba(122,111,143,0.15)',
              label: 'Log out',
              onPress: handleLogout,
            },
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(parent)/_layout.tsx).
  root: { flex: 1 },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },
  // Hard, unblurred offset shadow - same "ledge" technique as Button/KidCard/RewardShopItem.
  cardLedge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 5 }],
  },
  card: {
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  rowDivider: { height: 2, backgroundColor: colors.border.default },
});
