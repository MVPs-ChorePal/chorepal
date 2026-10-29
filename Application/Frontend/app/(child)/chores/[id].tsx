// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator,
  Image, ScrollView, LogBox
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCamera, IconCheck, IconConfetti } from '@tabler/icons-react-native';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import { categoryForTag, CATEGORY_ICONS } from '../../../constants/choreCategories';

import BackButton from '../../../components/BackButton';
import ChildHeader from '../../../components/ChildHeader';
import Coin from '../../../components/Coin';
import Star from '../../../components/Star';

// Source of truth: Figma "Wireframes" > Chore Details · To Do / Photo Taken /
// Checking (Pending) / Complete (Approved)
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=704-12

//ignore log warnings
// LogBox.ignoreAllLogs(); 

// Placeholder-only checklist content — chores has no steps column yet, so
// this is purely decorative/local state (not persisted, resets on reload).
const PLACEHOLDER_STEPS = [
  'Make your bed nice and neat',
  'Put your toys in their bins',
  'Pick up clothes off the floor',
  'Line up your books on the shelf',
];

const STEP_COPY = {
  todo: { empty: 'Do the steps, then snap a photo!', captured: 'Nice work! Send it to your grown-up.' },
  pending: { empty: 'Do the steps, then snap a photo to prove it!', captured: 'Nice work! Send it to your grown-up.' },
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

function Pill({ children, bg = colors.surface.white, textColor = colors.text.primary, bordered = false, style }) {
  return (
    <View style={[pillStyles.base, { backgroundColor: bg }, bordered && pillStyles.bordered, style]}>
      {typeof children === 'string'
        ? <Text style={[pillStyles.text, { color: textColor }]} numberOfLines={1}>{children}</Text>
        : children}
    </View>
  );
}

function ChoreHeroCard({ title, icon: CategoryIcon, tone, iconSize = 64, children }) {
  return (
    <View>
      <View pointerEvents="none" style={[heroStyles.ledge, { backgroundColor: tone.shadow }]} />
      <View style={[heroStyles.card, { backgroundColor: tone.base }]}>
        <View style={heroStyles.titleRow}>
          <View style={[heroStyles.iconBadge, { width: iconSize, height: iconSize, borderRadius: iconSize === 64 ? radius.button : radius.small }]}>
            <CategoryIcon size={iconSize * 0.5} color={tone.base} />
          </View>
          <Text style={heroStyles.title} numberOfLines={1}>{title}</Text>
        </View>
        {children ? <View style={heroStyles.pillRow}>{children}</View> : null}
      </View>
    </View>
  );
}

function MascotBubble({ text, starSize = 45 }) {
  return (
    <View style={bubbleStyles.row}>
      <Star size={starSize} />
      <View style={bubbleStyles.wrap}>
        <View pointerEvents="none" style={bubbleStyles.ledge} />
        <View style={bubbleStyles.bubble}>
          <Text style={bubbleStyles.text}>{text}</Text>
        </View>
      </View>
    </View>
  );
}

function ChecklistCard() {
  const [checked, setChecked] = useState(() => PLACEHOLDER_STEPS.map(() => false));
  const doneCount = checked.filter(Boolean).length;
  const toggle = (i) => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <View>
      <View pointerEvents="none" style={checklistStyles.ledge} />
      <View style={checklistStyles.card}>
        <View style={checklistStyles.header}>
          <Text style={typography.h2}>How to do it</Text>
          <Pill bg={colors.status.successSubtle} textColor={colors.status.successText}>
            {`${doneCount} of ${PLACEHOLDER_STEPS.length}`}
          </Pill>
        </View>
        {PLACEHOLDER_STEPS.map((step, i) => (
          <TouchableOpacity key={i} style={checklistStyles.row} onPress={() => toggle(i)} activeOpacity={0.7}>
            <View style={[checklistStyles.checkbox, checked[i] && checklistStyles.checkboxChecked]}>
              {checked[i] && <IconCheck size={18} color={colors.icon.inverse} />}
            </View>
            <Text style={[checklistStyles.stepText, checked[i] && checklistStyles.stepTextChecked]}>{step}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function StatusTracker() {
  return (
    <View style={trackerStyles.row}>
      <View style={trackerStyles.step}>
        <View style={[trackerStyles.node, trackerStyles.nodeDone]}>
          <IconCheck size={20} color={colors.icon.inverse} />
        </View>
        <Text style={trackerStyles.label}>Did it</Text>
      </View>
      <View style={[trackerStyles.bar, trackerStyles.barDone]} />
      <View style={trackerStyles.step}>
        <View style={[trackerStyles.node, trackerStyles.nodeActive]}>
          <View style={trackerStyles.activeDot} />
        </View>
        <Text style={trackerStyles.label}>Checking</Text>
      </View>
      <View style={trackerStyles.bar} />
      <View style={trackerStyles.step}>
        <View style={[trackerStyles.node, trackerStyles.nodePending]}>
          <Coin size={20} />
        </View>
        <Text style={[trackerStyles.label, trackerStyles.labelMuted]}>Coins!</Text>
      </View>
    </View>
  );
}

function Confetti() {
  // Simplified static flourish for the celebration screen — no animation.
  const pieces = [
    { top: '6%', left: '8%', color: colors.status.warning, rotate: '10deg' },
    { top: '4%', left: '85%', color: colors.category.clean.base, rotate: '-15deg' },
    { top: '14%', left: '45%', color: colors.surface.white, rotate: '20deg' },
    { top: '22%', left: '70%', color: colors.category.outdoor.base, rotate: '30deg' },
    { top: '30%', left: '15%', color: colors.surface.white, rotate: '-10deg' },
    { top: '38%', left: '90%', color: colors.status.warning, rotate: '25deg' },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <IconConfetti
          key={i}
          size={18}
          color={p.color}
          style={{ position: 'absolute', top: p.top, left: p.left, transform: [{ rotate: p.rotate }] }}
        />
      ))}
    </View>
  );
}

export default function ChoreSubmissionMachine() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const cameraRef = useRef<any>(null);

  const [chore, setChore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [buttonState, setButtonState] = useState<'idle' | 'checkmark' | 'verified'>('idle');
  const [aiNote, setAiNote] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [childFirstName, setChildFirstName] = useState('');

  useEffect(() => {
    setCapturedPhoto(null);
    setIsProcessing(false);
    setButtonState('idle');
    setAiNote('');
    fetchChoreDetails();
  }, [id]);

  useEffect(() => { fetchChildProfile(); }, []);

  //fetch chore details from supabase
  async function fetchChoreDetails() {
    console.log(`[debug] loading chore: ${id}`);
    const { data: choreData } = await supabase.from('chores').select('*').eq('id', id).single();

    if (choreData) {
      let analysisQuery = supabase
        .from('chore_analysis')
        .select('before_image_key, after_image_key, ai_feedback')
        .eq('chore_id', id)
        .order('created_at', { ascending: false });

      //if completed, specifically look for the successful attempt
      if (choreData.status === 'completed' || choreData.status === 'approved') {
        analysisQuery = analysisQuery.eq('needs_revision', false);
      }

      const { data: analysisData } = await analysisQuery.limit(1).maybeSingle();

      setChore({ ...choreData, ...analysisData });
      if (analysisData?.ai_feedback) setAiNote(analysisData.ai_feedback);
    }
    setLoading(false);
  }

  //additive: fetches the child's first name for the Frame 4 celebration message
  async function fetchChildProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('users').select('display_name').eq('id', session.user.id).single();
    if (data?.display_name) setChildFirstName(data.display_name.split(' ')[0]);
  }

  //handle photo capture from camera
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.4 });
    setCapturedPhoto(photo.uri);
  };

  //submit logic & ai verification
  const handleSubmit = async () => {
    if (!capturedPhoto || isProcessing) return;

    try {
      setIsProcessing(true);
      const isBefore = chore?.status === 'todo';
      const fileName = `${isBefore ? 'before' : 'after'}_${id}_${Date.now()}.jpg`;

      //get s3 pass
      const { data: urlData, error: urlError } = await supabase.functions.invoke('get-upload-url', {
        body: { fileName, fileType: 'image/jpeg' }
      });
      if (urlError) throw urlError;

      //upload photo to s3
      const blobResponse = await fetch(capturedPhoto);
      const photoBlob = await blobResponse.blob();
      await fetch(urlData.uploadUrl, { method: 'PUT', body: photoBlob, headers: { 'Content-Type': 'image/jpeg' } });

      if (isBefore) {
        //count how many rows already exist for this chore
        const { count } = await supabase.from('chore_analysis').select('*', { count: 'exact', head: true }).eq('chore_id', id);
        const nextAttempt = (count || 0) + 1;

        //insert new row into chore_analysis
        await supabase.from('chore_analysis').insert({
          chore_id: id,
          before_image_key: fileName,
          attempt_number: nextAttempt
        });

        await supabase.from('chores').update({ status: 'pending' }).eq('id', id);

        setButtonState('checkmark');
        setTimeout(() => {
          setButtonState('idle');
          setCapturedPhoto(null);
          fetchChoreDetails();
        }, 1500);
      } else {
        //phase 2: logic for attempts
        //look for an open row waiting for an after photo
        const { data: openLogs } = await supabase.from('chore_analysis').select('*').eq('chore_id', id).is('after_image_key', null).limit(1);

        let logIdToUse;

        if (openLogs && openLogs.length > 0) {
          //use existing row from phase 1
          logIdToUse = openLogs[0].id;
          await supabase.from('chore_analysis').update({ after_image_key: fileName }).eq('id', logIdToUse);
        } else {
          //retry logic: create a brand new row but reuse the original before key
          const { data: firstLog } = await supabase.from('chore_analysis').select('before_image_key').eq('chore_id', id).order('created_at', { ascending: true }).limit(1).single();

          //calculate next attempt number
          const { count } = await supabase.from('chore_analysis').select('*', { count: 'exact', head: true }).eq('chore_id', id);
          const nextAttempt = (count || 0) + 1;

          //create a brand new history row
          const { data: newLog } = await supabase.from('chore_analysis').insert({
            chore_id: id,
            before_image_key: firstLog?.before_image_key,
            after_image_key: fileName,
            attempt_number: nextAttempt
          }).select().single();

          logIdToUse = newLog.id;
        }

        //trigger ai verification
        const aiResponse = await supabase.functions.invoke('verify-with-ai', {
          body: { fileName, choreId: id, logId: logIdToUse }
        });

        if (aiResponse.data?.isMatch) {
          setButtonState('verified');
          setTimeout(() => fetchChoreDetails(), 1500);
        } else {
          setAiNote(aiResponse.data?.feedback || "ai check failed");
          setCapturedPhoto(null);
          fetchChoreDetails();
        }
      }
    } catch (e) {
      console.error("PIPELINE ERROR:", e.message);
    } finally {
      setIsProcessing(false); //ensures button is never stuck
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brand.primary} /></View>;

  const category = categoryForTag(chore?.target_label);
  const tone = colors.category[category];
  const CategoryIcon = CATEGORY_ICONS[category];
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  const s3Path = `https://${process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.EXPO_PUBLIC_AWS_REGION}.amazonaws.com/`;

  console.log(chore?.status)

  //FRAME 4: Complete (Approved) — no new backend call, "collect" just dismisses
  if (chore?.status === 'approved') {
    return (
      <View style={styles.celebrationRoot}>
        <Stack.Screen options={{ headerShown: false }} />
        <Confetti />
        <View style={styles.celebrationContent}>
          <Text style={styles.celebrationLabel}>CHORE COMPLETE!</Text>
          <View style={styles.celebrationCoinRow}>
            <Coin size={64} />
            <Text style={styles.celebrationAmount}>+{chore.reward_amount}</Text>
          </View>
          <Star size={102} />
          <View style={bubbleStyles.wrap}>
            <View pointerEvents="none" style={bubbleStyles.ledge} />
            <View style={[bubbleStyles.bubble, styles.celebrationBubble]}>
              <Text style={[bubbleStyles.text, styles.celebrationBubbleText]}>
                {childFirstName ? `Amazing job, ${childFirstName}! Your ${chore.title.toLowerCase()} looks great.` : `Amazing job! Your ${chore.title.toLowerCase()} looks great.`}
              </Text>
            </View>
          </View>
          <View style={styles.celebrationChoreRow}>
            <View pointerEvents="none" style={styles.celebrationChoreLedge} />
            <View style={styles.celebrationChoreCard}>
              <Image source={{ uri: s3Path + chore.after_image_key }} style={styles.celebrationThumb} />
              <Text style={typography.h3} numberOfLines={1}>{chore.title}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.collectWrap} onPress={() => router.back()} activeOpacity={0.85}>
            <View pointerEvents="none" style={styles.collectLedge} />
            <View style={styles.collectButton}>
              <Text style={styles.collectText}>Collect my coins!</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  //FRAME 3: Checking (Pending) — AI-verified, waiting on the parent's approval
  if (chore?.status === 'pending') {
    return (
      <SafeAreaView style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ChildHeader left={<BackButton />} />

          <ChoreHeroCard title={chore.title} icon={CategoryIcon} tone={tone} iconSize={56}>
            <Pill><Coin size={16} /><Text style={pillStyles.text}>{chore.reward_amount}</Text></Pill>
            <Pill textColor={tone.shadow}>{categoryLabel}</Pill>
          </ChoreHeroCard>

          <View style={styles.statusWrap}>
            <View pointerEvents="none" style={styles.statusLedge} />
            <View style={styles.statusCard}>
              <Star size={65} />
              <Text style={typography.h2}>Your grown-up is checking!</Text>
              <Text style={styles.statusSubtext}>{"You'll get your coins as soon as they say OK."}</Text>
              <StatusTracker />
            </View>
          </View>

          <View style={styles.photoBox}>
            <Image source={{ uri: s3Path + chore.after_image_key }} style={styles.photoImage} />
            <Pill bordered style={styles.photoLabel}>Your photo</Pill>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  //FRAMES 1 & 2: To Do / Photo Taken (also reused for the 'pending' after-photo step)
  const bubbleText = aiNote
    ? aiNote.toLowerCase()
    : (STEP_COPY[chore?.status]?.[capturedPhoto ? 'captured' : 'empty'] ?? '');

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ChildHeader left={<BackButton />} />

        <ChoreHeroCard title={chore?.title} icon={CategoryIcon} tone={tone}>
          <Pill><Coin size={16} /><Text style={pillStyles.text}>{chore?.reward_amount}</Text></Pill>
          <Pill>{formatDueDate(chore?.due_date)}</Pill>
          <Pill textColor={tone.shadow}>{categoryLabel}</Pill>
        </ChoreHeroCard>

        <MascotBubble text={bubbleText} />

        <ChecklistCard />

        <Text style={typography.h2}>Show your grown-up</Text>

        <View style={styles.photoArea}>
          {capturedPhoto ? (
            <>
              <Image source={{ uri: capturedPhoto }} style={styles.photoAreaImage} />
              <TouchableOpacity
                style={styles.retakeWrap}
                onPress={() => setCapturedPhoto(null)}
                disabled={isProcessing}
              >
                <Pill bordered>Retake</Pill>
              </TouchableOpacity>
            </>
          ) : permission?.granted ? (
            <>
              <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef} />
              <TouchableOpacity style={styles.snapWrap} onPress={handleCapture}>
                <View pointerEvents="none" style={styles.snapLedge} />
                <View style={styles.snapButton}>
                  <IconCamera size={26} color={colors.icon.inverse} />
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.dropzone}>
              <TouchableOpacity style={styles.cameraCtaWrap} onPress={requestPermission}>
                <View pointerEvents="none" style={styles.cameraCtaLedge} />
                <View style={styles.cameraCtaButton}>
                  <IconCamera size={34} color={colors.icon.inverse} />
                </View>
              </TouchableOpacity>
              <Text style={styles.dropzoneText}>{"Snap a photo when you're done"}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.ctaWrap}
          onPress={handleSubmit}
          disabled={!capturedPhoto || isProcessing}
          activeOpacity={0.85}
        >
          {capturedPhoto && <View pointerEvents="none" style={styles.ctaLedge} />}
          <View style={[styles.ctaButton, !capturedPhoto && styles.ctaButtonDisabled]}>
            {isProcessing ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : buttonState === 'checkmark' || buttonState === 'verified' ? (
              <IconCheck size={28} color={colors.icon.inverse} />
            ) : (
              <Text style={[styles.ctaText, !capturedPhoto && styles.ctaTextDisabled]}>I did it!</Text>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          {capturedPhoto ? "Your grown-up will check it and send your coins" : 'Take a photo first to unlock this button'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const pillStyles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  bordered: { borderWidth: 2, borderColor: colors.border.default },
  text: { ...typography.body, fontSize: 16 },
});

const heroStyles = StyleSheet.create({
  ledge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, transform: [{ translateY: 6 }] },
  card: { borderRadius: 28, padding: spacing.xl, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBadge: { backgroundColor: colors.surface.white, justifyContent: 'center', alignItems: 'center' },
  title: { ...typography.display, color: colors.text.inverse, flexShrink: 1 },
  pillRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});

const bubbleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wrap: { flex: 1 },
  ledge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.button, backgroundColor: colors.shadow.ledge, transform: [{ translateY: 4 }] },
  bubble: { backgroundColor: colors.surface.white, borderWidth: 2, borderColor: colors.border.default, borderRadius: radius.button, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  text: { ...typography.body, fontSize: 16 },
});

const checklistStyles = StyleSheet.create({
  ledge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card, backgroundColor: colors.shadow.ledge, transform: [{ translateY: 5 }] },
  card: { backgroundColor: colors.surface.white, borderWidth: 2, borderColor: colors.border.default, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxs },
  checkbox: { width: 32, height: 32, borderRadius: 10, borderWidth: 3, borderColor: colors.border.default, backgroundColor: colors.surface.white, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.status.success, borderColor: colors.status.success },
  stepText: { ...typography.body, fontSize: 16, flex: 1 },
  stepTextChecked: { color: colors.text.secondary, textDecorationLine: 'line-through' },
});

const trackerStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  step: { alignItems: 'center', gap: 6 },
  node: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  nodeDone: { backgroundColor: colors.status.success },
  nodeActive: { backgroundColor: colors.status.warning, borderWidth: 3, borderColor: colors.status.pending },
  activeDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.surface.white },
  nodePending: { backgroundColor: colors.surface.white, borderWidth: 3, borderColor: colors.border.default },
  label: { ...typography.body, fontSize: 16 },
  labelMuted: { color: colors.text.secondary },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border.default, marginHorizontal: 4 },
  barDone: { backgroundColor: colors.status.success },
});

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(child)/_layout.tsx).
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },

  // Dropzone / camera / captured-photo area
  photoArea: { height: 320, borderRadius: radius.card, overflow: 'hidden', backgroundColor: '#000' },
  dropzone: { flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 3, borderColor: colors.brand.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  dropzoneText: { ...typography.body, fontSize: 16 },
  cameraCtaWrap: { width: 76, height: 76 },
  cameraCtaLedge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 38, backgroundColor: colors.brand.primaryShadow, transform: [{ translateY: 5 }] },
  cameraCtaButton: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  snapWrap: { position: 'absolute', bottom: spacing.xl, alignSelf: 'center', width: 60, height: 60 },
  snapLedge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 30, backgroundColor: colors.brand.primaryShadow, transform: [{ translateY: 4 }] },
  snapButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  photoAreaImage: { flex: 1, resizeMode: 'cover' },
  retakeWrap: { position: 'absolute', top: spacing.sm, right: spacing.sm },

  // CTA
  ctaWrap: { width: '100%' },
  ctaLedge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.button, backgroundColor: colors.brand.primaryShadow, transform: [{ translateY: 5 }] },
  ctaButton: { borderRadius: radius.button, paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand.primary },
  ctaButtonDisabled: { backgroundColor: colors.surface.neutral, opacity: 0.6 },
  ctaText: { ...typography.h3, fontSize: 24, color: colors.text.inverse },
  ctaTextDisabled: { color: colors.text.tertiary },
  helperText: { ...typography.body, fontSize: 14, color: colors.text.secondary, textAlign: 'center' },

  // Frame 3 "Checking" status card
  statusWrap: {},
  statusLedge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, backgroundColor: colors.status.pending, transform: [{ translateY: 6 }] },
  statusCard: { backgroundColor: colors.status.warningSubtle, borderWidth: 3, borderColor: colors.status.warning, borderRadius: 28, padding: spacing.xl, alignItems: 'center', gap: spacing.lg },
  statusSubtext: { ...typography.body, fontSize: 16, color: colors.status.warningText, textAlign: 'center' },
  photoBox: { height: 320, borderRadius: radius.card, overflow: 'hidden', borderWidth: 4, borderColor: colors.surface.white },
  photoImage: { flex: 1, resizeMode: 'cover' },
  photoLabel: { position: 'absolute', top: spacing.sm, left: spacing.sm },

  // Frame 4 "Complete (Approved)" celebration
  celebrationRoot: { flex: 1, backgroundColor: colors.category.kitchen.base },
  celebrationContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.lg },
  celebrationLabel: { ...typography.body, fontSize: 16, color: colors.text.inverse, textTransform: 'uppercase', letterSpacing: 1 },
  celebrationCoinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  celebrationAmount: { ...typography.display, fontSize: 64, color: colors.text.inverse },
  celebrationBubble: { width: '100%' },
  celebrationBubbleText: { textAlign: 'center' },
  celebrationChoreRow: { width: '100%' },
  celebrationChoreLedge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card, backgroundColor: colors.shadow.ledge, transform: [{ translateY: 5 }] },
  celebrationChoreCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface.white, borderWidth: 2, borderColor: colors.border.default, borderRadius: radius.card, padding: spacing.md },
  celebrationThumb: { width: 80, height: 80, borderRadius: radius.small, backgroundColor: colors.surface.neutral },
  collectWrap: { width: '100%' },
  collectLedge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.button, backgroundColor: colors.status.pending, transform: [{ translateY: 5 }] },
  collectButton: { borderRadius: radius.button, paddingVertical: spacing.lg, alignItems: 'center', backgroundColor: colors.status.warning },
  collectText: { ...typography.h3, fontSize: 24, color: colors.text.primary },
});
