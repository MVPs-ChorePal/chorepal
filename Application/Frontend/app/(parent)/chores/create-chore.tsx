//@ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, Platform, KeyboardAvoidingView, Modal, Dimensions, LogBox
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { showAlert } from '../../../utils/alert';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, radius, spacing } from '../../../constants/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';

//silences error box
LogBox.ignoreAllLogs();

const { width } = Dimensions.get('window');

//categories for chore selection with corresponding ai tags
const CATEGORIES = [
  { id: 1, label: 'CLEAN', icon: 'restaurant-outline', aiTag: 'Dishware' },
  { id: 2, label: 'YARD', icon: 'leaf-outline', aiTag: 'Plant' },
  { id: 3, label: 'WASH', icon: 'shirt-outline', aiTag: 'Clothing' },
  { id: 4, label: 'BED', icon: 'bed-outline', aiTag: 'Bed' },
  { id: 5, label: 'PETS', icon: 'paw-outline', aiTag: 'Animal' },
  { id: 6, label: 'TRASH', icon: 'trash-outline', aiTag: 'Waste Container' },
];

export default function CreateChore() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [children, setChildren] = useState([]);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState(''); 
  const [selectedChildId, setSelectedChildId] = useState('all'); 
  const [selectedAiTag, setSelectedAiTag] = useState('Dishware');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => { fetchChildren(); }, []);

  async function fetchChildren() {
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
  }

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
    setReward('');
    setSelectedChildId('all');
    setSelectedAiTag('Dishware');
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
        reward_amount: parseInt(reward) || 500,
        assigned_to: kid.id, 
        created_by: session.user.id,
        status: 'todo', 
        target_label: selectedAiTag, 
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.brand.primary} />
          <Text style={styles.backText}>back</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionTitle}>select category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                onPress={() => setSelectedAiTag(cat.aiTag)} 
                style={[styles.catItem, selectedAiTag === cat.aiTag && styles.activeCat]}
              >
                <Ionicons name={cat.icon} size={28} color={selectedAiTag === cat.aiTag ? colors.icon.inverse : colors.brand.primary} />
                <Text style={[styles.catLabel, selectedAiTag === cat.aiTag && {color: colors.text.inverse}]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>chore title</Text>
              <Input placeholder="e.g. Unload the Dishwasher" value={title} onChangeText={setTitle} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>details</Text>
              <Input
                placeholder="Tell them exactly how to complete..."
                style={styles.textArea}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>assign to:</Text>
              <View style={styles.childList}>
                <View style={styles.childItem}>
                  <TouchableOpacity style={[styles.childCircle, selectedChildId === 'all' && styles.activeChild]} onPress={() => setSelectedChildId('all')}>
                    <Text style={[styles.childInitial, selectedChildId === 'all' && {color: colors.text.inverse}]}>All</Text>
                  </TouchableOpacity>
                </View>

                {children.map(child => (
                  <View key={child.id} style={styles.childItem}>
                    <TouchableOpacity
                      style={[styles.childCircle, selectedChildId === child.id && styles.activeChild]}
                      onPress={() => setSelectedChildId(child.id)}
                    >
                      <Text style={[styles.childInitial, selectedChildId === child.id && {color: colors.text.inverse}]}>
                        {formatFirstName(child.display_name).charAt(0)}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.childName} numberOfLines={1}>{formatFirstName(child.display_name)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.dateBox}>
                 <Text style={styles.label}>deadline</Text>
                 <TouchableOpacity style={styles.pillInput} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.valueText}>{date.toLocaleDateString()}</Text>
                 </TouchableOpacity>
              </View>
              <View style={styles.rewardBox}>
                 <Text style={styles.label}>reward</Text>
                 <View style={styles.pillInput}>
                    <TextInput keyboardType="numeric" value={reward} onChangeText={setReward} style={styles.valueText} placeholder="500" placeholderTextColor={colors.text.tertiary} />
                    <Text style={styles.unitText}>pts</Text>
                 </View>
              </View>
            </View>
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
  // Background + top/side margins come from the Tabs' sceneStyle (app/(parent)/_layout.tsx)
  // — this screen is registered on that Tabs navigator (href: null hides it from the bar).
  root: { flex: 1 },
  header: { paddingVertical: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: colors.brand.primary, fontSize: 18, fontWeight: '600', marginLeft: 5 },
  scroll: { paddingBottom: 150, gap: spacing.xl },
  sectionTitle: { fontSize: 13, color: colors.brand.primary, fontWeight: '800', textTransform: 'uppercase' },
  catScroll: {},
  catItem: { width: 85, height: 85, borderRadius: radius.full, backgroundColor: colors.surface.white, justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2 },
  activeCat: { backgroundColor: colors.brand.primary },
  catLabel: { fontSize: 9, fontWeight: '900', marginTop: 5, color: colors.brand.primary },
  formCard: { backgroundColor: colors.surface.white, borderRadius: radius.medium, padding: 25, gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  label: { fontSize: 11, fontWeight: '800', color: colors.text.primary, textTransform: 'uppercase' },
  textArea: { height: 100, textAlignVertical: 'top' },
  childList: { flexDirection: 'row', gap: spacing.xl, flexWrap: 'wrap' },
  childItem: { alignItems: 'center', width: 60, gap: spacing.sm },
  childCircle: { width: 55, height: 55, borderRadius: radius.full, borderWidth: 2, borderColor: colors.brand.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface.white },
  activeChild: { backgroundColor: colors.brand.primary },
  childInitial: { fontWeight: '800', color: colors.brand.primary, fontSize: 14 },
  childName: { fontSize: 10, color: colors.text.primary, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  dateBox: { flex: 1.2, gap: spacing.sm },
  rewardBox: { flex: 1, gap: spacing.sm },
  pillInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.neutral, borderRadius: radius.button, paddingHorizontal: 15, height: 55 },
  valueText: { color: colors.text.primary, fontWeight: '700', fontSize: 15, flex: 1 },
  unitText: { color: colors.text.primary, fontWeight: '400', fontSize: 13, marginLeft: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(255, 247, 232, 0.95)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  modalContent: { backgroundColor: colors.surface.white, padding: 30, borderRadius: radius.medium, width: '100%', alignItems: 'center', gap: spacing.md },
  modalHeader: { fontSize: 14, fontWeight: '800', color: colors.brand.primary, textTransform: 'uppercase' },
});