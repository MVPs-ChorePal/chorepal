// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, 
  Dimensions, Image, ScrollView, Platform, LogBox 
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

//ignore log warnings
LogBox.ignoreAllLogs();
const { width } = Dimensions.get('window');

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

  useEffect(() => {
    setCapturedPhoto(null);
    setIsProcessing(false);
    setButtonState('idle');
    setAiNote('');
    fetchChoreDetails();
  }, [id]);

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

  if (loading) return <View style={styles.center}><ActivityIndicator color="#005DA7" /></View>;

  //VIEW 3: SUMMARY
  if (chore?.status === 'completed' || chore?.status === 'approved') {
    const s3Path = `https://${process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.EXPO_PUBLIC_AWS_REGION}.amazonaws.com/`;

    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backLink}>‹ back</Text></TouchableOpacity>
          <View style={[styles.badge, (chore.status === 'approved' || chore.status === 'completed') && { backgroundColor: '#339d39' }]}>
            <Text style={styles.badgeText}>{chore.status}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.summaryWrapper} showsVerticalScrollIndicator={false}>
          <Text style={styles.summaryTitle}>{chore.title.toLowerCase()}</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>ai feedback</Text>
            <Text style={styles.infoText}>{aiNote || 'task verified successfully'}</Text>
          </View>
          
          <View style={styles.imageGrid}>
            <View style={styles.imageBox}>
              <Text style={styles.imgLabel}>before</Text>
              <Image source={{ uri: s3Path + chore.before_image_key }} style={styles.imgDisplay} />
            </View>
            <View style={styles.imageBox}>
              <Text style={styles.imgLabel}>after</Text>
              <Image source={{ uri: s3Path + chore.after_image_key }} style={styles.imgDisplay} />
            </View>
          </View>

          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={styles.rewardLarge}>{chore.reward_amount} pts</Text>
            <Text style={styles.infoText}>{chore.description || ''}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  //VIEW 1 & 2: CAMERA
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.mainWrapper}>
        <View style={styles.topSection}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backLink}>‹ back</Text></TouchableOpacity>
          <Text style={styles.title}>{chore?.title.toLowerCase()}</Text>
          <Text style={styles.instruction}>{aiNote ? aiNote.toLowerCase() : (chore?.status === 'todo' ? 'step 1: capture the mess' : 'step 2: verify your work')}</Text>
        </View>

        <View style={styles.middleSection}>
          <View style={styles.cameraContainer}>
            {capturedPhoto ? <Image source={{ uri: capturedPhoto }} style={styles.camera} /> : <CameraView style={styles.camera} facing="back" ref={cameraRef} />}
            <View style={styles.overlay}>
              {capturedPhoto ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.roundBtn, {backgroundColor: '#FF4B4B'}]} onPress={() => setCapturedPhoto(null)} disabled={isProcessing}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
                  <TouchableOpacity style={[styles.roundBtn, {backgroundColor: '#43A047'}]} onPress={handleSubmit} disabled={isProcessing}>
                    {isProcessing ? <ActivityIndicator color="#FFF" /> : buttonState === 'checkmark' ? <Ionicons name="checkmark" size={28} color="#FFF" /> : buttonState === 'verified' ? <Text style={styles.btnTextMini}>OK</Text> : <Ionicons name="arrow-up" size={28} color="#FFF" />}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.snapButton} onPress={handleCapture}><View style={styles.innerSnap} /></TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainWrapper: { flex: 1, paddingVertical: 20, alignItems: 'center' },
  topSection: { alignItems: 'center', width: '100%', paddingHorizontal: 30 },
  backLink: { color: '#8E8E93', fontSize: 18 },
  title: { fontSize: 32, fontWeight: '800', color: '#1A234E', marginTop: 10 },
  instruction: { fontSize: 14, color: '#005DA7', fontWeight: '500', marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },
  middleSection: { flex: 1, justifyContent: 'center' },
  cameraContainer: { width: width * 0.88, height: width * 1.1, borderRadius: 50, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center' },
  snapButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  innerSnap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF' },
  actionRow: { flexDirection: 'row', gap: 30 },
  roundBtn: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  btnTextMini: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  summaryWrapper: { paddingHorizontal: 30, alignItems: 'center', paddingBottom: 120 },
  summaryTitle: { fontSize: 28, fontWeight: '800', color: '#1A234E', alignSelf: 'center', marginTop: 10 },
  badge: { backgroundColor: '#005DA7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  imageGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  imageBox: { width: '47%' },
  imgLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase', textAlign: 'center', fontWeight: '700' },
  imgDisplay: { width: '100%', height: 180, borderRadius: 25, backgroundColor: '#000' },
  infoCard: { backgroundColor: '#FFF', width: '100%', borderRadius: 30, padding: 25, marginTop: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  infoTitle: { fontSize: 11, fontWeight: '800', color: '#005DA7', textTransform: 'uppercase', marginBottom: 10 },
  infoText: { fontSize: 15, color: '#1A234E', lineHeight: 22 },
  rewardLarge: { fontSize: 32, fontWeight: '800', color: '#005DA7' },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingTop: 10 }
});