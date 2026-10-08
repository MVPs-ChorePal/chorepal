//@ts-nocheck
import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';

//grabs only the first "word" of a name, lowercased to match the app's style
const firstName = (name) => (name || 'child').trim().split(' ')[0].toLowerCase();

export default function ParentRewards() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null); //chore or reward currently being saved
  const [children, setChildren] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCost, setNewCost] = useState('');

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

      //everyone in the household: kids for balances/chores, parents for the shared store
      const { data: members, error: membersError } = await supabase
        .from('users')
        .select('id, display_name, role, current_balance')
        .eq('family_id', profile.family_id);
      if (membersError) throw membersError;

      const kids = members.filter(m => m.role === 'child');
      const parentIds = members.filter(m => m.role === 'parent').map(m => m.id);
      setChildren(kids);

      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('id, title, point_cost')
        .in('created_by', parentIds)
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

  const handleAddReward = async () => {
    const cost = parseInt(newCost);
    if (!newTitle.trim() || !cost || cost <= 0) {
      Alert.alert('error', 'enter a reward name and a point cost');
      return;
    }

    setBusyId('new');
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('rewards')
      .insert({ title: newTitle.trim(), point_cost: cost, created_by: session.user.id });
    setBusyId(null);

    if (error) {
      Alert.alert('error', error.message.toLowerCase());
      return;
    }
    setNewTitle('');
    setNewCost('');
    fetchData();
  };

  //archived instead of deleted so redemption history keeps its reward name
  const handleRemoveReward = async (reward) => {
    setBusyId(reward.id);
    const { error } = await supabase.from('rewards').update({ archived: true }).eq('id', reward.id);
    setBusyId(null);
    if (error) {
      Alert.alert('error', error.message.toLowerCase());
      return;
    }
    fetchData();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color="#005DA7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#005DA7" />}
      >
        <Text style={styles.title}>rewards</Text>

        {/* each child's spendable points */}
        <Text style={styles.sectionTitle}>balances</Text>
        {children.length === 0 ? (
          <Text style={styles.emptyText}>no children in your household yet</Text>
        ) : (
          <View style={styles.card}>
            {children.map((kid, i) => (
              <View key={kid.id} style={[styles.balanceRow, i > 0 && styles.rowDivider]}>
                <Text style={styles.balanceName}>{firstName(kid.display_name)}</Text>
                <Text style={styles.balanceValue}>{Number(kid.current_balance || 0)} pts</Text>
              </View>
            ))}
          </View>
        )}

        {/* what the kids can spend points on */}
        <Text style={styles.sectionTitle}>reward store</Text>
        <View style={styles.card}>
          {rewards.length === 0 && <Text style={styles.emptyText}>add a reward your kids can earn</Text>}
          {rewards.map((reward, i) => (
            <View key={reward.id} style={[styles.balanceRow, i > 0 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceName}>{reward.title.toLowerCase()}</Text>
                <Text style={styles.cardSub}>{Number(reward.point_cost)} pts</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveReward(reward)} disabled={busyId !== null}>
                <Ionicons name="trash-outline" size={20} color="#BDC4D4" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={[styles.addRow, rewards.length > 0 && styles.rowDivider]}>
            <TextInput
              placeholder="e.g. 30 min screen time"
              placeholderTextColor="#BDC4D4"
              style={[styles.input, { flex: 1 }]}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              placeholder="pts"
              placeholderTextColor="#BDC4D4"
              keyboardType="numeric"
              style={[styles.input, styles.costInput]}
              value={newCost}
              onChangeText={setNewCost}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddReward} disabled={busyId !== null}>
              {busyId === 'new' ? <ActivityIndicator color="#FFF" /> : <Ionicons name="add" size={24} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 25, paddingBottom: 140 },
  title: { fontSize: 24, fontWeight: '300', color: '#005DA7', letterSpacing: -1, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#1A234E', textTransform: 'uppercase', marginTop: 25, marginBottom: 12 },
  emptyText: { color: '#BDC4D4', fontWeight: '300', marginBottom: 5 },
  card: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginBottom: 15 },
  cardSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#EDF0FF' },
  balanceName: { fontSize: 15, fontWeight: '600', color: '#1A234E' },
  balanceValue: { fontSize: 15, fontWeight: '800', color: '#005DA7' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  input: { backgroundColor: '#EDF0FF', borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12, color: '#1A234E', fontSize: 14 },
  costInput: { width: 70, textAlign: 'center' },
  addBtn: { backgroundColor: '#005DA7', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
});