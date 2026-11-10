//@ts-nocheck
import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { showAlert } from '../../../utils/alert';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import RewardAmountPicker from '../../../components/RewardAmountPicker';
import ParentHeader from '../../../components/parent/ParentHeader';
import BackButton from '../../../components/BackButton';
import {
  REWARD_CATEGORIES, REWARD_CATEGORY_ICONS, REWARD_CATEGORY_LABELS, RewardCategoryValue
} from '../../../constants/rewardCategories';

// Built to match the "Parent New Chore" frame's layout/form patterns — there's
// no dedicated Figma frame for reward creation yet.
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=0-1

// A selectable reward-category chip — same visual language as components/Category.tsx
// (icon frame above a label, ledge shadow on selection), but driven by the reward
// category tone/icon maps (constants/rewardCategories.ts) instead of the chore
// ones, so it can't just reuse that component.
function RewardCategoryChip({ value, selected, onPress }: { value: RewardCategoryValue; selected: boolean; onPress: () => void }) {
  const tone = colors.rewardCategory[value];
  const CategoryIcon = REWARD_CATEGORY_ICONS[value];

  return (
    <View style={chipStyles.wrap}>
      <View pointerEvents="none" style={[chipStyles.ledge, { backgroundColor: selected ? tone.shadow : colors.shadow.ledge }]} />
      <TouchableOpacity
        style={[chipStyles.chip, selected ? { backgroundColor: tone.base } : chipStyles.unselected]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={[chipStyles.iconFrame, { backgroundColor: selected ? colors.surface.white : tone.base }]}>
          <CategoryIcon size={22} color={selected ? tone.base : colors.icon.inverse} />
        </View>
        <Text style={[chipStyles.label, { color: selected ? colors.text.inverse : colors.text.primary }]} numberOfLines={1}>
          {REWARD_CATEGORY_LABELS[value]}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CreateReward() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [title, setTitle] = useState(params.title ? String(params.title) : '');
  const [cost, setCost] = useState(params.cost ? Number(params.cost) : 500);
  const [category, setCategory] = useState<RewardCategoryValue>((params.category as RewardCategoryValue) || 'fun');

  const clearForm = () => {
    setTitle('');
    setCost(500);
    setCategory('fun');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !cost) return; //silent for now

    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('rewards')
          .update({ title: title.trim(), point_cost: cost, category })
          .eq('id', params.id);
        if (error) throw error;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { error } = await supabase
          .from('rewards')
          .insert({ title: title.trim(), point_cost: cost, category, created_by: session.user.id });
        if (error) throw error;
      }

      setLoading(false);
      setIsSuccess(true); //switch button to checkmark

      setTimeout(() => {
        clearForm();
        setIsSuccess(false);
        router.back();
      }, 3000);

    } catch (error: any) {
      console.error('DATABASE ERROR:', error.message);
      showAlert('error', error.message.toLowerCase());
      setLoading(false);
    }
  };

  //archived instead of deleted so redemption history keeps its reward name
  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('rewards').update({ archived: true }).eq('id', params.id);
    setDeleting(false);

    if (error) {
      showAlert('error', error.message.toLowerCase());
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <ParentHeader left={<BackButton fallbackHref="/(parent)/(tabs)/rewards" />} right={isEditing ? 'Edit Reward' : 'New Reward'} />

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>{isEditing ? 'Edit this reward' : 'Create a new reward'}</Text>
            <Input placeholder="e.g. Extra screen time" value={title} onChangeText={setTitle} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={typography.h3}>Category</Text>
            <View style={styles.catRow}>
              {REWARD_CATEGORIES.map(cat => (
                <RewardCategoryChip key={cat} value={cat} selected={category === cat} onPress={() => setCategory(cat)} />
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <RewardAmountPicker value={cost} onChange={setCost} presets={[500, 1000, 2000, 5000]} step={100} />
          </View>

          <Button
            title="Submit"
            onPress={handleSubmit}
            loading={loading}
            disabled={isSuccess}
            icon={isSuccess ? <Ionicons name="checkmark-sharp" size={32} color={colors.icon.inverse} /> : undefined}
            fullWidth
          />

          {isEditing && (
            <Button
              title="Delete reward"
              variant="outline"
              color="error"
              onPress={handleDelete}
              loading={deleting}
              disabled={loading}
              fullWidth
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
});

// Mirrors components/Category.tsx's chip styles exactly, just scoped locally
// since this chip is parameterized by reward (not chore) tone/icon maps.
const chipStyles = StyleSheet.create({
  wrap: { flex: 1 },
  ledge: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.button,
    transform: [{ translateY: 4 }],
  },
  chip: {
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.button,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  unselected: { backgroundColor: colors.surface.white, borderWidth: 2, borderColor: colors.border.default },
  iconFrame: { width: 44, height: 44, borderRadius: radius.small, justifyContent: 'center', alignItems: 'center' },
  label: { ...typography.body },
});
