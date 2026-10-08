//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, 
  Dimensions, Image, ScrollView, Alert 
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const S3_BUCKET = process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME;
const S3_PATH = `https://${S3_BUCKET}.s3.${process.env.EXPO_PUBLIC_AWS_REGION}.amazonaws.com/`;

export default function ParentChoreReview() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [chore, setChore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); //handles loading state for buttons

  useEffect(() => {
    fetchReviewDetails();
  }, [id]);

  //fetches chore details, child name, and ai evidence logs
  async function fetchReviewDetails() {
    try {
      //fetch the main chore record
      const { data: choreData, error: choreError } = await supabase
        .from('chores')
        .select('*, users!assigned_to(display_name)')
        .eq('id', id)
        .single();
      
      if (choreError) throw choreError;

      //fetch the latest successful ai attempt from analysis table
      const { data: analysisData } = await supabase
        .from('chore_analysis')
        .select('*')
        .eq('chore_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setChore({ ...choreData, ...analysisData });
    } catch (e) {
      console.error("fetch review error:", e.message);
    } finally {
      setLoading(false);
    }
  }

  //moves money to child and sets status to approved
  const handleApprove = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('approve_chore', { p_chore_id: id });
    if (error) {
      console.error("approval error:", error.message);
    } else {
      router.replace('/(parent)/home');
    }
    setBusy(false);
  };

  //moves status back to todo/pending so child can redo it
  const handleReject = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('reject_chore', { p_chore_id: id });
    if (error) {
      console.error("rejection error:", error.message);
    } else {
      router.replace('/(parent)/home');
    }
    setBusy(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#005DA7" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ back</Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, (chore?.status === 'approved' || chore?.status === 'completed') && { backgroundColor: '#339d39' }]}>
          <Text style={styles.statusBadgeText}>{chore?.status || 'pending'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{chore?.title || 'review chore'}</Text>
        <Text style={styles.childName}>Assigned to: {chore?.users?.display_name}</Text>

        {/* feedback card at the top */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ai analysis</Text>
          <Text style={styles.infoText}>{chore?.ai_feedback || 'verification pending'}</Text>
          <Text style={styles.confidenceText}>Confidence: {Math.round(chore?.ai_confidence_score || 0)}%</Text>
        </View>

        {/* side by side comparison below feedback */}
        <View style={styles.imageGrid}>
          <View style={styles.imageBox}>
            <Text style={styles.imgLabel}>before</Text>
            <View style={styles.imgContainer}>
              {chore?.before_image_key ? (
                <Image source={{ uri: S3_PATH + chore.before_image_key }} style={styles.img} />
              ) : (
                <Ionicons name="image-outline" size={32} color="#BDC4D4" />
              )}
            </View>
          </View>
          <View style={styles.imageBox}>
            <Text style={styles.imgLabel}>after</Text>
            <View style={styles.imgContainer}>
              {chore?.after_image_key ? (
                <Image source={{ uri: S3_PATH + chore.after_image_key }} style={styles.img} />
              ) : (
                <Ionicons name="image-outline" size={32} color="#BDC4D4" />
              )}
            </View>
          </View>
        </View>

        <View style={styles.rewardSection}>
          <Text style={styles.rewardPoints}>{chore?.reward_amount || 0} pts</Text>
          <Text style={styles.descriptionText}>{chore?.description || 'no notes provided'}</Text>
        </View>

        {/* action buttons at the bottom */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.rejectBtn]}
            onPress={handleReject}
            disabled={busy}
          >
            <Text style={styles.btnText}>reject</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.btn, styles.approveBtn]} 
            onPress={handleApprove}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>approve</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 30, paddingBottom: 60, alignItems: 'center' },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 15 },
  backText: { color: '#8E8E93', fontSize: 18, fontWeight: '300' },
  statusBadge: { backgroundColor: '#005DA7', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15 },
  statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '800', color: '#1A234E', marginTop: 10 },
  childName: { fontSize: 14, color: '#005DA7', fontWeight: '500', marginTop: 5 },
  infoCard: { backgroundColor: '#FFF', width: '100%', borderRadius: 30, padding: 25, marginTop: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  infoTitle: { fontSize: 11, fontWeight: '800', color: '#005DA7', textTransform: 'uppercase', marginBottom: 10 },
  infoText: { fontSize: 15, color: '#1A234E', lineHeight: 22, fontWeight: '500' },
  confidenceText: { fontSize: 10, color: '#BDC4D4', marginTop: 10, fontWeight: '600' },
  imageGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 25 },
  imageBox: { width: '47%' },
  imgLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase', textAlign: 'center', fontWeight: '700' },
  imgContainer: { width: '100%', height: 180, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#D1D9FF' },
  img: { width: '100%', height: '100%' },
  rewardSection: { marginTop: 30, alignItems: 'center' },
  rewardPoints: { fontSize: 28, fontWeight: '800', color: '#005DA7' },
  descriptionText: { fontSize: 14, color: '#8E8E93', marginTop: 5, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 40, width: '100%' },
  btn: { flex: 1, paddingVertical: 18, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { backgroundColor: '#FF4B4B', borderWidth: 1, borderColor: '#FF4B4B' },
  approveBtn: { backgroundColor: '#339d39' },
  btnText: { color: '#FFF', fontWeight: '700', textTransform: 'lowercase' }
});