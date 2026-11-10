//@ts-nocheck
import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ScrollView, Platform, KeyboardAvoidingView, Modal
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { showAlert } from '../../../utils/alert';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IconMoodSmile } from '@tabler/icons-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import RewardAmountPicker from '../../../components/RewardAmountPicker';
import Category, { CategoryValue } from '../../../components/Category';
import { CATEGORY_AI_TAGS } from '../../../constants/choreCategories';
import ParentHeader from '../../../components/parent/ParentHeader';
import BackButton from '../../../components/BackButton';

// Source of truth: Figma "Parent New Chore"
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=0-1

const CATEGORIES: CategoryValue[] = ['clean', 'kitchen', 'outdoor', 'other'];

// Rotating palette so each child's avatar reads as a distinct color, cycling
// through the same category tones used elsewhere in the design system.
const CHILD_TONES = [colors.category.kitchen, colors.category.clean, colors.category.outdoor, colors.category.other];

export default function CreateChore() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [children, setChildren] = useState([]);

  const [title, setTitle] = useState('');
  const [reward, setReward] = useState(500);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>('clean');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Steps are local-only for now — not persisted to Supabase.
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState('');
  const [addingStep, setAddingStep] = useState(false);

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
    setReward(500);
    setSelectedChildId('all');
    setSelectedCategory('clean');
    setDate(new Date());
    setSteps([]);
    setNewStep('');
    setAddingStep(false);
  };

  const handleAddStep = () => {
    const trimmed = newStep.trim();
    if (trimmed) setSteps(prev => [...prev, trimmed]);
    setNewStep('');
    setAddingStep(false);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  //handles date change from the date picker
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'android') setShowDatePicker(false);
    setDate(currentDate);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isToday = isSameDay(date, today);
  const isTomorrow = isSameDay(date, tomorrow);

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
        //no history to pop when this screen was reached without a push (e.g.
        //a page refresh while already on it) - go home instead of a no-op
        router.canGoBack() ? router.back() : router.replace('/(parent)/(tabs)/home');
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
            <View style={styles.sectionHeading}>
              <Text style={typography.h3}>Steps</Text>
              <Text style={typography.bodySecondary}>Your kid sees these as a checklist</Text>
            </View>

            <View style={styles.stepsCard}>
              <View pointerEvents="none" style={styles.stepsCardLedge} />
              <View style={styles.stepsCardFace}>
                {steps.map((step, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.stepRow}
                    onPress={() => removeStep(index)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </TouchableOpacity>
                ))}

                {addingStep ? (
                  <Input
                    autoFocus
                    placeholder="e.g. Scrub the plates until they sparkle"
                    value={newStep}
                    onChangeText={setNewStep}
                    onSubmitEditing={handleAddStep}
                    onBlur={handleAddStep}
                    returnKeyType="done"
                    containerStyle={styles.stepInput}
                  />
                ) : (
                  <TouchableOpacity style={styles.addStepBtn} onPress={() => setAddingStep(true)} activeOpacity={0.7}>
                    <Text style={styles.addStepLabel}>+ Add a step</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>{"Who's doing it?"}</Text>
            <View style={styles.pillRow}>
              <TouchableOpacity style={styles.pillChipWrap} onPress={() => setSelectedChildId('all')} activeOpacity={0.85}>
                {selectedChildId === 'all' && <View pointerEvents="none" style={styles.pillChipLedge} />}
                <View style={[styles.pillChip, selectedChildId === 'all' ? styles.pillChipSelected : styles.pillChipUnselected]}>
                  <Text style={[styles.pillChipLabel, { color: selectedChildId === 'all' ? colors.text.inverse : colors.text.primary }]}>
                    All
                  </Text>
                </View>
              </TouchableOpacity>

              {children.map((child, index) => {
                const selected = selectedChildId === child.id;
                const tone = CHILD_TONES[index % CHILD_TONES.length];
                return (
                  <TouchableOpacity
                    key={child.id}
                    style={styles.pillChipWrap}
                    onPress={() => setSelectedChildId(child.id)}
                    activeOpacity={0.85}
                  >
                    {selected && <View pointerEvents="none" style={styles.pillChipLedge} />}
                    <View style={[styles.pillChip, styles.pillChipWithAvatar, selected ? styles.pillChipSelected : styles.pillChipUnselected]}>
                      <View style={[styles.childAvatar, { backgroundColor: tone.base }]}>
                        {/* <IconMoodSmile size={16} color={colors.icon.inverse} /> */}
                      </View>
                      <Text style={[styles.pillChipLabel, { color: selected ? colors.text.inverse : colors.text.primary }]} numberOfLines={1}>
                        {formatFirstName(child.display_name)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>When?</Text>
            <View style={styles.pillRow}>
              <TouchableOpacity style={styles.pillChipWrap} onPress={() => setDate(new Date())} activeOpacity={0.85}>
                {isToday && <View pointerEvents="none" style={styles.pillChipLedge} />}
                <View style={[styles.pillChip, isToday ? styles.pillChipSelected : styles.pillChipUnselected]}>
                  <Text style={[styles.pillChipLabel, { color: isToday ? colors.text.inverse : colors.text.primary }]}>
                    Today
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pillChipWrap} onPress={() => setDate(tomorrow)} activeOpacity={0.85}>
                {isTomorrow && <View pointerEvents="none" style={styles.pillChipLedge} />}
                <View style={[styles.pillChip, isTomorrow ? styles.pillChipSelected : styles.pillChipUnselected]}>
                  <Text style={[styles.pillChipLabel, { color: isTomorrow ? colors.text.inverse : colors.text.primary }]}>
                    Tomorrow
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pillChipWrap} onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
                {!isToday && !isTomorrow && <View pointerEvents="none" style={styles.pillChipLedge} />}
                <View style={[styles.pillChip, !isToday && !isTomorrow ? styles.pillChipSelected : styles.pillChipUnselected]}>
                  <Text
                    style={[styles.pillChipLabel, { color: !isToday && !isTomorrow ? colors.text.inverse : colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {!isToday && !isTomorrow ? date.toLocaleDateString() : 'Pick a day'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
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
  sectionHeading: { gap: 2 },
  catRow: { flexDirection: 'row', gap: 10 },
  pillRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },

  // Steps card — same "ledge" offset-shadow technique as RewardAmountPicker.
  stepsCard: { width: '100%' },
  stepsCardLedge: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 5 }],
  },
  stepsCardFace: {
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
  stepInput: { width: '100%' },
  addStepBtn: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.brand.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStepLabel: { ...typography.body, fontSize: 16, color: colors.brand.primaryShadow },

  // Selectable pill chips — ledge shadow on selection, like Category/RewardAmountPicker.
  // Shared by "Who's doing it?" (child + "All" pills) and "When?".
  pillChipWrap: {},
  pillChipLedge: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primaryShadow,
    transform: [{ translateY: 3 }],
  },
  pillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pillChipWithAvatar: { paddingLeft: 6 },
  pillChipSelected: { backgroundColor: colors.brand.primary },
  pillChipUnselected: { backgroundColor: colors.surface.white, borderWidth: 2, borderColor: colors.border.default },
  pillChipLabel: { ...typography.body, fontSize: 16 },
  childAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(255, 247, 232, 0.95)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  modalContent: { backgroundColor: colors.surface.white, padding: 30, borderRadius: radius.medium, width: '100%', alignItems: 'center', gap: spacing.md },
  modalHeader: { fontSize: 14, fontWeight: '800', color: colors.brand.primary, textTransform: 'uppercase' },
});
