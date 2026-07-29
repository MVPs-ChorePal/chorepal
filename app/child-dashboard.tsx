// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, Alert, Platform, Dimensions 
} from 'react-native';
import { supabase } from '../utils/supabase';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  
  const [role, setRole] = useState<'parent' | 'child' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    fetchUserRole();
  }, []);

  //fetches user role from supabase and sets state
  async function fetchUserRole() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/'); return; }

    const { data } = await supabase.from('users').select('role').eq('id', session.user.id);
    if (data && data.length > 0) {
      setRole(data[0].role);
      setLoading(false);
    } else {
      setTimeout(fetchUserRole, 2000);
    }
  }

  //capture, upload, stores
  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    try {
      setIsCapturing(true);
      
      //capture
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4 });
      const fileName = `chore_${Date.now()}.jpg`;

      console.log("photo captured, requesting upload url");

      //calls edge function to get a signed url for s3 upload
      const urlResponse = await supabase.functions.invoke('get-upload-url', {
        body: { fileName, fileType: 'image/jpeg' }
      });

      //safety gate
      if (!urlResponse.data || !urlResponse.data.uploadUrl) {
        throw new Error("failed to get upload url");
      }

      console.log("link received. pushing to s3");
      const secretUploadUrl = urlResponse.data.uploadUrl;

      //convert uri to blob and push to s3
      const blobResponse = await fetch(photo.uri);
      const blob = await blobResponse.blob();
      const uploadResult = await fetch(secretUploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' }
      });

      if (!uploadResult.ok) {
        throw new Error("s3 upload failed");
      }

        console.log("successfully uploaded:", fileName, ". requesting ai verification");

        //trigger ai verification
        const aiResponse = await supabase.functions.invoke('verify-with-ai', {
            body: { fileName }
        });

        //safety gate
        if (aiResponse.data?.labels) {
            const foundItems = aiResponse.data.labels.join(", ").toLowerCase();
            Alert.alert("verification good", `found items: ${foundItems}`);
        } else {
            Alert.alert("verification failed");
        }

    } catch (error: any) {
        console.error("pipeline error", error.message);
        Alert.alert("error", "could not complete the process");
    } finally {
        setIsCapturing(false);
    }
};

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator color="#000" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.mainWrapper}>
        <View style={styles.topSection}>
          <Text style={styles.title}>{role} dashboard</Text>
        </View>

        <View style={styles.middleSection}>
          <View style={styles.cameraContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.webPlaceholder}><Text style={styles.placeholderText}>mobile only feature</Text></View>
            ) : !permission?.granted ? (
              <TouchableOpacity style={styles.webPlaceholder} onPress={requestPermission}>
                <Text style={styles.placeholderText}>tap to enable camera</Text>
              </TouchableOpacity>
            ) : (
              <CameraView style={styles.camera} facing="back" ref={cameraRef}>
                <TouchableOpacity style={styles.captureButton} onPress={takePhoto} disabled={isCapturing}>
                  {isCapturing ? <ActivityIndicator color="#000" /> : <View style={styles.innerCircle} />}
                </TouchableOpacity>
              </CameraView>
            )}
          </View>
          <Text style={styles.instructionText}>tap to test aws s3 upload</Text>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  center: { justifyContent: 'center', alignItems: 'center' },
  mainWrapper: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 30, paddingVertical: 50 },
  topSection: { alignItems: 'center', marginTop: 10 },
  title: { fontSize: 24, fontWeight: '300', letterSpacing: -1 },
  middleSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraContainer: {
    width: width * 0.88, height: width * 1.2, borderRadius: 50,
    overflow: 'hidden', backgroundColor: '#FBFBFB', borderWidth: 1, borderColor: '#F0F0F0',
  },
  camera: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 30 },
  webPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  placeholderText: { color: '#AAA', textAlign: 'center', fontWeight: '200', fontSize: 14 },
  instructionText: { marginTop: 25, color: '#000000', fontSize: 11, fontWeight: '300' },
  captureButton: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
  },
  innerCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF' },
  bottomSection: { alignItems: 'center', marginBottom: 10 },
  logoutText: { color: '#AAA', fontSize: 13, textDecorationLine: 'underline', fontWeight: '300' }
});