//@ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../../constants/theme';
import { categoryForTag } from '../../../constants/choreCategories';
import Button from '@/components/Button';

import Chore from '@/components/parent/Chore';
import KidCard from '@/components/parent/KidCard';

const firstName = (name) => (name || 'child').trim().split(' ')[0].toLowerCase();

// Capitalized, for the Kid card's headline name (vs. the lowercase inline
// label used next to chore cards).
const capitalizedFirstName = (name) => {
  const first = (name || 'Child').trim().split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

// "families" has no name field (Database/schema.sql) - derive a greeting
// from the logged-in parent's own display_name instead of fabricating one.
const familyNameFrom = (fullName) => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return 'Your family';
  const last = parts[parts.length - 1];
  return `The ${last.charAt(0).toUpperCase() + last.slice(1).toLowerCase()} family`;
};

// Rotating palette so each kid's avatar reads as a distinct color - same
// convention as the "Who's doing it?" picker on Parent New Chore.
const KID_TONES = [colors.category.kitchen, colors.category.clean, colors.category.outdoor, colors.category.other];

export default function ParentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [familyName, setFamilyName] = useState('Your family');
  const [kids, setKids] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [dueToday, setDueToday] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('users').select('family_id, display_name').eq('id', session.user.id).single();
      if (!profile?.family_id) return;
      setFamilyName(familyNameFrom(profile.display_name));

      //fetch family members to get child names + balances
      const { data: familyMembers } = await supabase.from('users').select('id, display_name, current_balance').eq('family_id', profile.family_id).eq('role', 'child');
      const kidIds = familyMembers?.map(k => k.id) || [];

      if (kidIds.length > 0) {
        const { data: rawChores, error: choresError } = await supabase
          .from('chores')
          .select('*')
          .in('assigned_to', kidIds)
          .order('created_at', { ascending: false });

        if (choresError) throw choresError;
        const allChores = rawChores || [];

        //"needs your OK" / "due today" exclude chores already approved
        const activeChores = allChores.filter(c => c.status !== 'approved');
        const waiting = activeChores.filter(c => c.status === 'completed');
        const todo = activeChores.filter(c => c.status === 'todo' || c.status === 'pending');

        setSubmissions(waiting.map(c => ({
          ...c,
          childName: firstName(familyMembers.find(k => k.id === c.assigned_to)?.display_name)
        })));

        setDueToday(todo.map(c => ({
          ...c,
          childName: firstName(familyMembers.find(k => k.id === c.assigned_to)?.display_name)
        })));

        //each kid's progress on chores due today (approved ones count as done)
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
        const todaysChores = allChores.filter(c => {
          if (!c.due_date) return false;
          const due = new Date(c.due_date);
          return due >= startOfToday && due <= endOfToday;
        });

        setKids(familyMembers.map((member, index) => {
          const memberToday = todaysChores.filter(c => c.assigned_to === member.id);
          const done = memberToday.filter(c => c.status === 'completed' || c.status === 'approved').length;
          return {
            id: member.id,
            name: capitalizedFirstName(member.display_name),
            avatarColor: KID_TONES[index % KID_TONES.length].base,
            balance: Number(member.current_balance) || 0,
            doneCount: done,
            totalCount: memberToday.length,
          };
        }));

      } else {
        setSubmissions([]);
        setDueToday([]);
        setKids([]);
      }
    } catch (e) {
      console.error("fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  //realtime listener to keep dashboard updated, instead of polling
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brand.primary} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        <View>
          <Text style={typography.h2}>Good morning!</Text>
          <Text style={typography.bodySecondary}>{familyName}</Text>
        </View>

        {kids.length > 0 && (
          <View style={styles.kidsRow}>
            {kids.map(kid => (
              <KidCard
                key={kid.id}
                name={kid.name}
                avatarColor={kid.avatarColor}
                doneCount={kid.doneCount}
                totalCount={kid.totalCount}
                balance={kid.balance}
              />
            ))}
          </View>
        )}

        {/* chores waiting for manual parent approval */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={typography.h2}>Needs your OK</Text>
            {submissions.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{submissions.length}</Text>
              </View>
            )}
          </View>
        </View>
        {submissions.length === 0 ? <Text style={{...typography.bodyTertiary}}>Nothing to approve right now</Text> :
          submissions.map(chore => (
            <Chore
              key={chore.id}
              title={chore.title}
              reward_amount={chore.reward_amount}
              child_name={chore.childName}
              status={chore.status}
              category={categoryForTag(chore.target_label)}
              onPress={() => router.push(`/(parent)/chores/${chore.id}`)}
            />
          ))
        }

        {/* chores currently in progress or not started */}
        <Text style={{...typography.h2}}>Due today</Text>
        {dueToday.length === 0 ? <Text style={styles.emptyText}>Nothing on the schedule</Text> :
          dueToday.map(chore => (
            <Chore
              key={chore.id}
              title={chore.title}
              reward_amount={chore.reward_amount}
              child_name={chore.childName}
              status={chore.status}
              category={categoryForTag(chore.target_label)}
              onPress={() => router.push(`/(parent)/chores/${chore.id}`)}
            />
          ))
        }
      </ScrollView>

      <Button title="+ New chore" onPress={() => router.push('/(parent)/chores/create-chore')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(parent)/_layout.tsx).
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },
  emptyText: { ...typography.bodyTertiary },
  kidsRow: { flexDirection: 'row', gap: spacing.md },
});