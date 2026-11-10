//@ts-nocheck
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../utils/supabase';
import { showAlert } from '../../../utils/alert';
import { colors, spacing } from '../../../constants/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import ParentHeader from '../../../components/parent/ParentHeader';
import BackButton from '../../../components/BackButton';

// Source of truth: Figma "Parent Edit Profile"
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=710-172

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // There's no `phone` column on users yet (Database/schema.sql) - kept
  // local-only for now, same as create-chore's "steps" field.
  const [phone, setPhone] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.from('users').select('display_name, email').eq('id', session.user.id).single();
      if (error) throw error;
      setName(data?.display_name ?? '');
      setEmail(data?.email ?? '');
    } catch (e) {
      console.error('FETCH PROFILE ERROR:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (email.trim() !== session.user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: email.trim() });
        if (authError) throw authError;
      }

      const { error } = await supabase
        .from('users')
        .update({ display_name: name.trim(), email: email.trim() })
        .eq('id', session.user.id);
      if (error) throw error;

      setSaving(false);
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        router.back();
      }, 1500);
    } catch (e: any) {
      console.error('SAVE PROFILE ERROR:', e.message);
      showAlert('error', e.message.toLowerCase());
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ParentHeader left={<BackButton fallbackHref="/(parent)/(tabs)/account" />} right="Edit profile" />

          <View style={styles.fieldGroup}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          </View>

          <View style={styles.fieldGroup}>
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.fieldGroup}>
            <Input label="Phone number" value={phone} onChangeText={setPhone} placeholder="(555) 123-4567" keyboardType="phone-pad" />
          </View>

          <Button
            title="Save changes"
            onPress={handleSave}
            loading={saving}
            disabled={isSuccess}
            icon={isSuccess ? <Ionicons name="checkmark-sharp" size={32} color={colors.icon.inverse} /> : undefined}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the wrapping Stack's contentStyle
  // (app/(parent)/_layout.tsx) - this screen is pushed on top of the (tabs)
  // navigator, not registered inside it.
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },
  fieldGroup: { gap: spacing.sm },
});
