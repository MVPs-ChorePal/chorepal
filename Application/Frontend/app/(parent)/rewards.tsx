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

const S3_BUCKET = process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME;
const S3_PATH = S3_BUCKET ? `https://${S3_BUCKET}.s3.${process.env.EXPO_PUBLIC_AWS_REGION}.amazonaws.com/` : null;

//grabs only the first "word" of a name, lowercased to match the app's style
const firstName = (name) => (name || 'child').trim().split(' ')[0].toLowerCase();

export default function ParentRewards() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null); //chore or reward currently being saved
  const [children, setChildren] = useState([]);
  const [submissions, setSubmissions] = useState([]); //ai-verified chores waiting on the parent
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

      if (kids.length > 0) {
        const { data: choresData, error: choresError } = await supabase
          .from('chores')
          .select('id, title, reward_amount, assigned_to, submitted_at')
          .in('assigned_to', kids.map(k => k.id))
          .eq('status', 'completed')
          .order('submitted_at', { ascending: true });
        if (choresError) throw choresError;

        //attach the latest successful ai attempt so the parent can review the evidence
        const choreIds = (choresData || []).map(c => c.id);
        let analysisByChore = {};
        if (choreIds.length > 0) {
          const { data: analysisData } = await supabase
            .from('chore_analysis')
            .select('chore_id, before_image_key, after_image_key, ai_feedback, created_at')
            .in('chore_id', choreIds)
            .eq('needs_revision', false)
            .order('created_at', { ascending: false });
          (analysisData || []).forEach(a => {
            if (!analysisByChore[a.chore_id]) analysisByChore[a.chore_id] = a;
          });
        }

        setSubmissions((choresData || []).map(c => ({
          ...c,
          ...analysisByChore[c.id],
          childName: firstName(kids.find(k => k.id === c.assigned_to)?.display_name),
        })));
      } else {
        setSubmissions([]);
      }

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

  const handleApprove = async (chore) => {
    setBusyId(chore.id);
    const { error } = await supabase.rpc('approve_chore', { p_chore_id: chore.id });
    setBusyId(null);
    if (error) {
      Alert.alert('error', error.message.toLowerCase());
      return;
    }
    Alert.alert('approved', `${chore.reward_amount} pts sent to ${chore.childName}`);
    fetchData();
  };

  const handleReject = async (chore) => {
    setBusyId(chore.id);
    const { error } = await supabase.rpc('reject_chore', { p_chore_id: chore.id });
    setBusyId(null);
    if (error) {
      Alert.alert('error', error.message.toLowerCase());
      return;
    }
    Alert.alert('sent back', `${chore.childName} will need to redo "${chore.title.toLowerCase()}"`);
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

        {/* chores the ai verified, waiting for the parent's final say */}
        <Text style={styles.sectionTitle}>waiting for approval</Text>
        {submissions.length === 0 ? (
          <Text style={styles.emptyText}>no chores waiting for approval</Text>
        ) : submissions.map(chore => (
          <View key={chore.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{chore.title.toLowerCase()}</Text>
                <Text style={styles.cardSub}>{chore.childName}</Text>
              </View>
              <View style={styles.pointsPill}>
                <Text style={styles.pointsPillText}>{chore.reward_amount} pts</Text>
              </View>
            </View>

            {!!chore.ai_feedback && (
              <View style={styles.aiBox}>
                <Ionicons name="sparkles-outline" size={14} color="#005DA7" />
                <Text style={styles.aiText}>{chore.ai_feedback}</Text>
              </View>
            )}

            {S3_PATH && (chore.before_image_key || chore.after_image_key) && (
              <View style={styles.imageRow}>
                {[['before', chore.before_image_key], ['after', chore.after_image_key]].map(([label, key]) => (
                  <View key={label} style={styles.imageBox}>
                    <Text style={styles.imgLabel}>{label}</Text>
                    {key ? <Image source={{ uri: S3_PATH + key }} style={styles.img} /> : <View style={styles.img} />}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleReject(chore)}
                disabled={busyId !== null}
              >
                <Text style={styles.rejectText}>reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleApprove(chore)}
                disabled={busyId !== null}
              >
                {busyId === chore.id ? <ActivityIndicator color="#FFF" /> : <Text style={styles.approveText}>approve</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ))}

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
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A234E' },
  cardSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  pointsPill: { backgroundColor: '#E8F0FE', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 6 },
  pointsPillText: { color: '#005DA7', fontWeight: '800', fontSize: 12 },
  aiBox: { flexDirection: 'row', gap: 8, backgroundColor: '#EDF0FF', borderRadius: 15, padding: 12, marginTop: 15 },
  aiText: { flex: 1, color: '#1A234E', fontSize: 13, lineHeight: 18 },
  imageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  imageBox: { width: '48%' },
  imgLabel: { fontSize: 10, color: '#8E8E93', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 },
  img: { width: '100%', height: 120, borderRadius: 15, backgroundColor: '#EDF0FF' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  rejectBtn: { backgroundColor: '#EDF0FF' },
  rejectText: { color: '#FF4B4B', fontWeight: '700' },
  approveBtn: { backgroundColor: '#005DA7' },
  approveText: { color: '#FFF', fontWeight: '700' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#EDF0FF' },
  balanceName: { fontSize: 15, fontWeight: '600', color: '#1A234E' },
  balanceValue: { fontSize: 15, fontWeight: '800', color: '#005DA7' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  input: { backgroundColor: '#EDF0FF', borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12, color: '#1A234E', fontSize: 14 },
  costInput: { width: 70, textAlign: 'center' },
  addBtn: { backgroundColor: '#005DA7', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
});
