//@ts-nocheck
import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View,
  ScrollView, Platform, KeyboardAvoidingView, Modal
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { showAlert } from '../../../utils/alert';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IconCalendar } from '@tabler/icons-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Pill from '../../../components/Pill';
import RewardAmountPicker from '../../../components/RewardAmountPicker';
import Category, { CategoryValue } from '../../../components/Category';
import { CATEGORY_AI_TAGS } from '../../../constants/choreCategories';
import ParentHeader from '../../../components/parent/ParentHeader';
import BackButton from '../../../components/BackButton';

// Source of truth: Figma "Parent New Chore"
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=0-1

const CATEGORIES: CategoryValue[] = ['clean', 'kitchen', 'outdoor', 'other'];

export default function CreateChore() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [children, setChildren] = useState([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState(500);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>('clean');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchChildren = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile.family_id) {
        console.error("FETCH ERROR: parent has no family_id yet");
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('family_id', profile.family_id)
        .eq('role', 'child');

      if (error) throw error;
      if (data) setChildren(data);
    } catch (e) {
      console.error("FETCH ERROR:", e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchChildren(); }, [fetchChildren]));

  //grabs only the first "word" and capitalizes it
  const formatFirstName = (name: string) => {
    if (!name) return 'Child';
    const cleaned = name.trim();
    const firstName = cleaned.split(' ')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  //clears the form after submission
  const clearForm = () => {
    setTitle('');
    setDescription('');
    setReward(500);
    setSelectedChildId('all');
    setSelectedCategory('clean');
    setDate(new Date());
  };

  //handles date change from the date picker
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'android') setShowDatePicker(false);
    setDate(currentDate);
  };

  const handleSubmit = async () => {
    if (!title) return; //silent for now

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetKids = selectedChildId === 'all' ? children : children.filter(c => c.id === selectedChildId);

      if (targetKids.length === 0) {
        showAlert("no children yet", "add a child to your household before assigning chores.");
        setLoading(false);
        return;
      }

      //prepare chore rows for each selected child
      const choreRows = targetKids.map(kid => ({
        title,
        description,
        reward_amount: reward,
        assigned_to: kid.id,
        created_by: session.user.id,
        status: 'todo',
        target_label: CATEGORY_AI_TAGS[selectedCategory],
        due_date: date.toISOString(),
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('chores').insert(choreRows);
      if (error) throw error;

      setLoading(false);
      setIsSuccess(true); //switch button to checkmark

      setTimeout(() => {
        clearForm();
        setIsSuccess(false);
        router.back();
      }, 3000);

    } catch (error: any) {
      console.error("DATABASE ERROR:", error.message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <ParentHeader left={<BackButton />} right="New Chore" />

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>Create a new chore</Text>
            <Input placeholder="e.g. Unload the Dishwasher" value={title} onChangeText={setTitle} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map(cat => (
                <Category key={cat} value={cat} selected={selectedCategory === cat} onPress={() => setSelectedCategory(cat)} />
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>Steps</Text>
            <Text style={typography.bodySecondary}>Your kid sees these as a checklist</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>{"Who's doing it?"}</Text>
            <View style={styles.pillRow}>
              <Pill selected={selectedChildId === 'all'} onPress={() => setSelectedChildId('all')}>All</Pill>
              {children.map(child => (
                <Pill
                  key={child.id}
                  selected={selectedChildId === child.id}
                  onPress={() => setSelectedChildId(child.id)}
                >
                  {formatFirstName(child.display_name)}
                </Pill>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>When?</Text>
            <Pill onPress={() => setShowDatePicker(true)} style={styles.dateField}>
              <IconCalendar size={20} color={colors.text.secondary} />
              <Text style={styles.dateFieldText}>{date.toLocaleDateString()}</Text>
            </Pill>
          </View>

          <View style={styles.fieldGroup}>
            <RewardAmountPicker value={reward} onChange={setReward} />
          </View>

          <Button
            title="Submit"
            onPress={handleSubmit}
            loading={loading}
            disabled={isSuccess}
            icon={isSuccess ? <Ionicons name="checkmark-sharp" size={32} color={colors.icon.inverse} /> : undefined}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Select Deadline</Text>
            <DateTimePicker value={date} mode="date" display="spinner" onChange={onDateChange} minimumDate={new Date()} textColor={colors.text.primary} />
            <Button title="Done" onPress={() => setShowDatePicker(false)} fullWidth />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the wrapping Stack's contentStyle
  // (app/(parent)/_layout.tsx) — this screen is pushed on top of the (tabs)
  // navigator, not registered inside it.
  root: { flex: 1 },
  scroll: { paddingBottom: spacing.xl, gap: spacing.xl },
  fieldGroup: { gap: spacing.sm },
  catRow: { flexDirection: 'row', gap: 10 },
  pillRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  dateField: { width: '100%', justifyContent: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  dateFieldText: { ...typography.body, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(255, 247, 232, 0.95)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  modalContent: { backgroundColor: colors.surface.white, padding: 30, borderRadius: radius.medium, width: '100%', alignItems: 'center', gap: spacing.md },
  modalHeader: { fontSize: 14, fontWeight: '800', color: colors.brand.primary, textTransform: 'uppercase' },
});
