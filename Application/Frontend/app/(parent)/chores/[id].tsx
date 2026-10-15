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
import { colors, typography, radius, spacing } from '../../../constants/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';

const { width } = Dimensions.get('window');
const S3_BUCKET = process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME;
const S3_PATH = `https://${S3_BUCKET}.s3.${process.env.EXPO_PUBLIC_AWS_REGION}.amazonaws.com/`;

export default function ParentChoreReview() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [chore, setChore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); //handles loading state for buttons
  const [rejectNote, setRejectNote] = useState(''); //optional feedback shown to the child on retry

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
    const { error } = await supabase.rpc('reject_chore', { p_chore_id: id, p_note: rejectNote });
    if (error) {
      console.error("rejection error:", error.message);
    } else {
      router.replace('/(parent)/home');
    }
    setBusy(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brand.primary} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ back</Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, (chore?.status === 'approved' || chore?.status === 'completed') && { backgroundColor: colors.status.success }]}>
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
                <Ionicons name="image-outline" size={32} color={colors.icon.secondary} />
              )}
            </View>
          </View>
          <View style={styles.imageBox}>
            <Text style={styles.imgLabel}>after</Text>
            <View style={styles.imgContainer}>
              {chore?.after_image_key ? (
                <Image source={{ uri: S3_PATH + chore.after_image_key }} style={styles.img} />
              ) : (
                <Ionicons name="image-outline" size={32} color={colors.icon.secondary} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.rewardSection}>
          <Text style={styles.rewardPoints}>{chore?.reward_amount || 0} pts</Text>
          <Text style={styles.descriptionText}>{chore?.description || 'no notes provided'}</Text>
        </View>

        {/* action buttons at the bottom - only while still waiting for review */}
        {chore?.status === 'completed' && (
          <>
            <Input
              placeholder="e.g. the dishes are still in the sink"
              onChangeText={setRejectNote}
              value={rejectNote}
              multiline
              textAlignVertical="top"
              style={styles.noteInput}
              containerStyle={styles.noteContainer}
              label="note for child if rejecting (optional)"
            />

            <View style={styles.actionRow}>
              <Button
                title="reject"
                color="error"
                onPress={handleReject}
                disabled={busy}
                style={styles.actionBtn}
              />

              <Button
                title="approve"
                color="success"
                onPress={handleApprove}
                loading={busy}
                style={styles.actionBtn}
              />
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(parent)/_layout.tsx).
  root: { flex: 1, gap: spacing.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 60, alignItems: 'center', gap: spacing.xl },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
  backText: { color: colors.text.secondary, fontSize: 18, fontWeight: '300' },
  statusBadge: { backgroundColor: colors.brand.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.small },
  statusBadgeText: { color: colors.text.inverse, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  title: { ...typography.h1, color: colors.text.primary },
  childName: { fontSize: 14, color: colors.brand.primary, fontWeight: '500' },
  infoCard: { backgroundColor: colors.surface.white, width: '100%', borderRadius: radius.medium, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, gap: spacing.sm },
  infoTitle: { ...typography.captionStrong, color: colors.brand.primary, textTransform: 'uppercase' },
  infoText: { fontSize: 15, color: colors.text.primary, lineHeight: 22, fontWeight: '500' },
  confidenceText: { fontSize: 10, color: colors.text.tertiary, fontWeight: '600' },
  imageGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  imageBox: { width: '47%', gap: spacing.sm },
  imgLabel: { fontSize: 11, color: colors.text.secondary, textTransform: 'uppercase', textAlign: 'center', fontWeight: '700' },
  imgContainer: { width: '100%', height: 180, borderRadius: radius.card, backgroundColor: colors.surface.white, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  img: { width: '100%', height: '100%' },
  rewardSection: { alignItems: 'center', gap: spacing.xs },
  rewardPoints: { fontSize: 28, fontWeight: '800', color: colors.brand.primary },
  descriptionText: { fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  noteContainer: { width: '100%' },
  noteInput: { height: 90, paddingTop: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  actionBtn: { flex: 1 },
});