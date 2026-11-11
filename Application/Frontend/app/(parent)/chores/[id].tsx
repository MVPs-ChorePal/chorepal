//@ts-nocheck
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Image, ScrollView } from 'react-native';
import { supabase } from '../../../utils/supabase';
import { showConfirm } from '../../../utils/alert';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconPhoto } from '@tabler/icons-react-native';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import { categoryForTag } from '../../../constants/choreCategories';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Pill from '../../../components/Pill';
import Coin from '../../../components/Coin';
import Star from '../../../components/Star';
import ParentHeader from '../../../components/parent/ParentHeader';
import BackButton from '../../../components/BackButton';

// Source of truth: Figma "Parent Review Chore"
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=708-146
//
// The Figma frame only covers the "waiting for review" state (status
// 'completed'). The other states reuse the same header and pill row:
//  - todo / pending (nothing submitted yet): the chore's steps + Edit/Delete,
//    since it's still safe to change before the child sends a photo.
//  - approved: the photo + AI check, read-only.

const S3_PATH = `https://${process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.EXPO_PUBLIC_AWS_REGION}.amazonaws.com/`;

// Rotating palette, same convention as Parent Home's KidCard. This screen
// only has the one child, so it just takes the first tone.
const AVATAR_TONE = colors.category.kitchen;

const firstName = (name) => {
  const first = (name || 'Your kid').trim().split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

function formatDueDate(dueDate) {
  if (!dueDate) return 'No due date';
  const due = new Date(dueDate);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(due) - startOfDay(new Date())) / 86400000);
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 0) return 'Overdue';
  return `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

const parseSteps = (raw) => {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Same mascot + speech bubble as the child's Chore Details screen, used here
// to present the AI's verdict on the photos.
function AiCheckBubble({ feedback, passed }) {
  return (
    <View style={bubbleStyles.row}>
      <Star size={45} />
      <View style={bubbleStyles.wrap}>
        <View pointerEvents="none" style={bubbleStyles.ledge} />
        <View style={bubbleStyles.bubble}>
          <View style={bubbleStyles.header}>
            <Text style={typography.h3}>AI check</Text>
            <Pill
              bordered={false}
              bg={passed ? colors.status.successSubtle : colors.status.warningSubtle}
              textColor={passed ? colors.status.successText : colors.status.warningText}
            >
              {passed ? 'Looks done' : 'Not sure'}
            </Pill>
          </View>
          <Text style={bubbleStyles.text}>{feedback || "The AI hasn't checked this photo yet."}</Text>
        </View>
      </View>
    </View>
  );
}

function StepsCard({ steps }) {
  return (
    <View>
      <View pointerEvents="none" style={styles.cardLedge} />
      <View style={styles.card}>
        <Text style={typography.h3}>Steps</Text>
        {steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ParentChoreReview() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [chore, setChore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); //handles loading state for buttons
  const [showBefore, setShowBefore] = useState(false); //before/after photo toggle
  const [redoOpen, setRedoOpen] = useState(false); //"Ask to redo" expands into a note field
  const [rejectNote, setRejectNote] = useState(''); //optional feedback shown to the child on retry

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

      //fetch the latest ai attempt from analysis table
      const { data: analysisData } = await supabase
        .from('chore_analysis')
        .select('*')
        .eq('chore_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      //analysis' own id/created_at would otherwise overwrite the chore's
      const { id: _analysisId, created_at: _analysisCreatedAt, ...analysis } = analysisData || {};
      setChore({ ...choreData, ...analysis });
    } catch (e) {
      console.error("fetch review error:", e.message);
    } finally {
      setLoading(false);
    }
  }

  //refetch on focus, so coming back from Edit shows the updated chore
  useFocusEffect(useCallback(() => {
    fetchReviewDetails();
  }, [id]));

  //moves money to child and sets status to approved
  const handleApprove = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('approve_chore', { p_chore_id: id });
    if (error) {
      console.error("approval error:", error.message);
    } else {
      router.replace('/(parent)/(tabs)/home');
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
      router.replace('/(parent)/(tabs)/home');
    }
    setBusy(false);
  };

  const handleEdit = () => {
    router.push({
      pathname: '/(parent)/chores/create-chore',
      params: {
        id: chore.id,
        title: chore.title,
        reward: String(chore.reward_amount),
        targetLabel: chore.target_label || '',
        assignedTo: chore.assigned_to,
        dueDate: chore.due_date,
        steps: chore.steps || '',
      },
    });
  };

  //cascades to chore_analysis (ON DELETE CASCADE) - only offered before the
  //child has submitted, never for approved chores, since transactions.chore_id
  //has no cascade and would reject the delete once a chore's been paid out
  const handleDelete = async () => {
    const confirmed = await showConfirm('Delete this chore?', 'This cannot be undone.', 'Delete');
    if (!confirmed) return;

    setBusy(true);
    const { error } = await supabase.from('chores').delete().eq('id', id);
    setBusy(false);
    if (error) {
      console.error('delete error:', error.message);
    } else {
      router.replace('/(parent)/(tabs)/home');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brand.primary} /></View>;

  const status = chore?.status;
  const isSubmitted = status === 'completed' || status === 'approved';
  const isAwaitingReview = status === 'completed';
  const kidName = firstName(chore?.users?.display_name);
  const tone = colors.category[categoryForTag(chore?.target_label)];
  const categoryKey = categoryForTag(chore?.target_label);
  const categoryLabel = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
  const steps = parseSteps(chore?.steps);

  const subtitle = {
    todo: `Waiting on ${kidName} to start`,
    pending: `${kidName} is working on it`,
    completed: `${kidName} says they finished`,
    approved: `You approved ${kidName}'s chore`,
  }[status] ?? `Assigned to ${kidName}`;

  const photoKey = showBefore ? chore?.before_image_key : chore?.after_image_key;

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ParentHeader left={<BackButton fallbackHref="/(parent)/(tabs)/home" />} right={isSubmitted ? 'Review chore' : 'Chore'} />

        <View style={styles.kidRow}>
          <View style={[styles.avatar, { backgroundColor: AVATAR_TONE.base }]}>
            <Text style={styles.avatarInitial}>{kidName.charAt(0)}</Text>
          </View>
          <View style={styles.kidText}>
            <Text style={typography.bodySecondary}>{subtitle}</Text>
            <Text style={typography.h2} numberOfLines={2}>{chore?.title}</Text>
          </View>
        </View>

        <View style={styles.pillRow}>
          <Pill style={styles.coinPill}>
            <Coin size={20} />
            <Text style={styles.pillText}>{chore?.reward_amount ?? 0}</Text>
          </Pill>
          <Pill bordered={false} bg={tone.subtle} textColor={tone.shadow}>{categoryLabel}</Pill>
          {status === 'approved'
            ? <Pill bordered={false} bg={colors.status.successSubtle} textColor={colors.status.successText}>Approved</Pill>
            : <Pill textColor={colors.text.secondary}>{formatDueDate(chore?.due_date)}</Pill>}
        </View>

        {isSubmitted ? (
          <>
            <View>
              <View pointerEvents="none" style={styles.photoLedge} />
              <View style={styles.photo}>
                {photoKey ? (
                  <Image source={{ uri: S3_PATH + photoKey }} style={styles.photoImage} />
                ) : (
                  <IconPhoto size={40} color={colors.icon.secondary} />
                )}
                {chore?.before_image_key && (
                  <View style={styles.photoToggle}>
                    <Pill selected={showBefore} onPress={() => setShowBefore(true)}>Before</Pill>
                    <Pill selected={!showBefore} onPress={() => setShowBefore(false)}>After</Pill>
                  </View>
                )}
              </View>
            </View>

            <AiCheckBubble feedback={chore?.ai_feedback} passed={!chore?.needs_revision} />

            {isAwaitingReview && (
              redoOpen ? (
                <>
                  <Input
                    label={`What should ${kidName} fix? (optional)`}
                    placeholder="e.g. the dishes are still in the sink"
                    value={rejectNote}
                    onChangeText={setRejectNote}
                    multiline
                    textAlignVertical="top"
                    style={styles.noteInput}
                  />
                  <Button title="Send back" color="primary" onPress={handleReject} loading={busy} fullWidth />
                  <Button title="Cancel" color="secondary" onPress={() => setRedoOpen(false)} disabled={busy} fullWidth />
                </>
              ) : (
                <>
                  <Button title="Approve" color="success" onPress={handleApprove} loading={busy} fullWidth />
                  <Button title="Ask to redo" color="secondary" onPress={() => setRedoOpen(true)} disabled={busy} fullWidth />
                </>
              )
            )}
          </>
        ) : (
          <>
            {chore?.description ? <Text style={typography.bodySecondary}>{chore.description}</Text> : null}
            {steps.length > 0 && <StepsCard steps={steps} />}

            {/* nothing to review yet - the chore can still be changed or removed */}
            <Button title="Edit chore" color="secondary" onPress={handleEdit} disabled={busy} fullWidth />
            <Button title="Delete chore" variant="outline" color="error" onPress={handleDelete} loading={busy} fullWidth />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the wrapping Stack's contentStyle
  // (app/(parent)/_layout.tsx) — this screen is pushed on top of the (tabs)
  // navigator, not registered inside it.
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },

  kidRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...typography.h2, color: colors.text.inverse },
  kidText: { flex: 1, gap: 2 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  coinPill: { paddingLeft: 6 },
  pillText: { ...typography.body, fontSize: 16 },

  // Photo: white 4px frame with the same hard "ledge" shadow as the cards.
  photoLedge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 24,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 5 }],
  },
  photo: {
    height: 260,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: colors.surface.white,
    backgroundColor: colors.surface.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  photoToggle: { position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', gap: spacing.xs },

  noteInput: { height: 90, paddingTop: spacing.sm },

  cardLedge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 5 }],
  },
  card: {
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface.neutral, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { ...typography.body, fontSize: 16 },
  stepText: { ...typography.body, fontSize: 16, flex: 1 },
});

const bubbleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  wrap: { flex: 1 },
  ledge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 5 }],
  },
  bubble: {
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  text: { ...typography.body, fontSize: 16 },
});
