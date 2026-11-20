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

  //what is currently saved - used to work out what changed
  const [saved, setSaved] = useState({ name: '', email: '', phone: '' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  //stored on the auth user (Authentication > Users), not on public.users
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      //getUser asks the server, so this is what is actually stored
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error('not signed in');

      const { data, error } = await supabase.from('users').select('display_name').eq('id', user.id).single();
      if (error) throw error;

      const current = {
        name: data?.display_name ?? '',
        email: user.email ?? '',
        phone: user.phone ? `+${user.phone}` : '',
      };
      setSaved(current);
      setName(current.name);
      setEmail(current.email);
      setPhone(current.phone);
      setCurrentPassword('');
      return current;
    } catch (e) {
      console.error('FETCH PROFILE ERROR:', e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const nameChanged = name.trim() !== saved.name;
  const emailChanged = email.trim().toLowerCase() !== saved.email.toLowerCase();
  const phoneChanged = phone.trim() !== saved.phone;
  //email and phone change straight away, so the server asks for the password first
  const needsPassword = emailChanged || phoneChanged;

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return showAlert('error', 'name and email are required');
    if (!nameChanged && !emailChanged && !phoneChanged) return showAlert('error', 'nothing to change');
    if (needsPassword && !currentPassword) return showAlert('error', 'enter your current password to change your email or phone');

    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (nameChanged) body.displayName = name.trim();
      if (emailChanged) body.email = email.trim();
      if (phoneChanged) body.phone = phone.trim();
      if (needsPassword) body.currentPassword = currentPassword;

      const { data, error } = await supabase.functions.invoke('update-profile', { body });
      if (error) {
        //invoke() doesn't throw on a non-2xx response - the reason is in the body
        let reason = 'could not save your changes, please try again';
        try {
          const errBody = await error.context?.json();
          if (errBody?.error) reason = errBody.error;
        } catch {}
        throw new Error(reason);
      }

      //only report success once a fresh read shows the new values are stored
      if (emailChanged) await supabase.auth.refreshSession();
      const now = await fetchProfile();
      const stored =
        now &&
        (!nameChanged || now.name === data.displayName) &&
        (!emailChanged || now.email.toLowerCase() === data.email.toLowerCase()) &&
        (!phoneChanged || now.phone === (data.phone ? `+${data.phone}` : ''));
      if (!stored) throw new Error('your changes could not be confirmed, please check and try again');

      const what = [nameChanged && 'name', emailChanged && 'email', phoneChanged && 'phone number'].filter(Boolean);
      const list = what.length > 1 ? `${what.slice(0, -1).join(', ')} and ${what[what.length - 1]}` : what[0];
      showAlert(
        'Saved',
        `Your ${list} ${what.length > 1 ? 'were' : 'was'} updated successfully.` +
          (data.notified ? ' We emailed you a notice about this change.' : ''),
      );

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
            <Input label="Phone number" value={phone} onChangeText={setPhone} placeholder="3475551234" keyboardType="phone-pad" />
          </View>

          {needsPassword && (
            <View style={styles.fieldGroup}>
              <Input
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Needed to change your email or phone"
                secureTextEntry
                autoCapitalize="none"
                testID="current-password-input"
              />
            </View>
          )}

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
