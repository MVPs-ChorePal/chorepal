//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Modal, Dimensions, LogBox
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

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
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('account_owner_id', session.user.id);
      
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
        console.error("CHORE ERROR: no children found.");
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
        status: 'pending', 
        target_label: selectedAiTag, 
        due_date: date.toISOString()
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#005DA7" />
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
                <Ionicons name={cat.icon} size={28} color={selectedAiTag === cat.aiTag ? '#FFF' : '#005DA7'} />
                <Text style={[styles.catLabel, selectedAiTag === cat.aiTag && {color: '#FFF'}]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.formCard}>
            <Text style={styles.label}>chore title</Text>
            <TextInput placeholder="e.g. Unload the Dishwasher" placeholderTextColor="#BDC4D4" style={styles.input} value={title} onChangeText={setTitle} />
            
            <Text style={styles.label}>details</Text>
            <TextInput placeholder="Tell them exactly how to complete..." placeholderTextColor="#BDC4D4" style={[styles.input, styles.textArea]} multiline value={description} onChangeText={setDescription} />

            <Text style={styles.label}>assign to:</Text>
            <View style={styles.childList}>
              <View style={styles.childItem}>
                <TouchableOpacity style={[styles.childCircle, selectedChildId === 'all' && styles.activeChild]} onPress={() => setSelectedChildId('all')}>
                  <Text style={[styles.childInitial, selectedChildId === 'all' && {color: '#FFF'}]}>All</Text>
                </TouchableOpacity>
              </View>

              {children.map(child => (
                <View key={child.id} style={styles.childItem}>
                  <TouchableOpacity 
                    style={[styles.childCircle, selectedChildId === child.id && styles.activeChild]} 
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <Text style={[styles.childInitial, selectedChildId === child.id && {color: '#FFF'}]}>
                      {formatFirstName(child.display_name).charAt(0)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.childName} numberOfLines={1}>{formatFirstName(child.display_name)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.row}>
              <View style={{flex: 1.2, marginRight: 15}}>
                 <Text style={styles.label}>deadline</Text>
                 <TouchableOpacity style={styles.pillInput} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.valueText}>{date.toLocaleDateString()}</Text>
                 </TouchableOpacity>
              </View>
              <View style={{flex: 1}}>
                 <Text style={styles.label}>reward</Text>
                 <View style={styles.pillInput}>
                    <TextInput keyboardType="numeric" value={reward} onChangeText={setReward} style={styles.valueText} placeholder="500" placeholderTextColor="#BDC4D4" />
                    <Text style={styles.unitText}>pts</Text>
                 </View>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleSubmit} 
            disabled={loading || isSuccess}
          >
            {isSuccess ? (
              <Ionicons name="checkmark-sharp" size={32} color="#FFF" />
            ) : loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Select Deadline</Text>
            <DateTimePicker value={date} mode="date" display="spinner" onChange={onDateChange} minimumDate={new Date()} textColor="#1A234E" />
            <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.modalDoneBtn}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF' },
  header: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#EDF0FF' },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#005DA7', fontSize: 18, fontWeight: '600', marginLeft: 5 },
  scroll: { paddingHorizontal: 25, paddingBottom: 150 },
  sectionTitle: { fontSize: 13, color: '#005DA7', fontWeight: '800', marginBottom: 15, textTransform: 'uppercase' },
  catScroll: { marginBottom: 30 },
  catItem: { width: 85, height: 85, borderRadius: 45, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2 },
  activeCat: { backgroundColor: '#005DA7' },
  catLabel: { fontSize: 9, fontWeight: '900', marginTop: 5, color: '#005DA7' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 40, padding: 25, marginBottom: 30 },
  label: { fontSize: 11, fontWeight: '800', color: '#1A234E', marginBottom: 10, textTransform: 'uppercase' },
  input: { backgroundColor: '#EDF0FF', borderRadius: 20, padding: 18, marginBottom: 25, color: '#1A234E', fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  childList: { flexDirection: 'row', gap: 20, marginBottom: 35, flexWrap: 'wrap' },
  childItem: { alignItems: 'center', width: 60 },
  childCircle: { width: 55, height: 55, borderRadius: 30, borderWidth: 2, borderColor: '#005DA7', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  activeChild: { backgroundColor: '#005DA7' },
  childInitial: { fontWeight: '800', color: '#005DA7', fontSize: 14 },
  childName: { fontSize: 10, color: '#1A234E', fontWeight: '600', marginTop: 8, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  pillInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDF0FF', borderRadius: 20, paddingHorizontal: 15, height: 55 },
  valueText: { color: '#1A234E', fontWeight: '700', fontSize: 15, flex: 1 },
  unitText: { color: '#1A234E', fontWeight: '400', fontSize: 13, marginLeft: 5 },
  submitBtn: { backgroundColor: '#005DA7', paddingVertical: 22, borderRadius: 35, alignItems: 'center', minHeight: 70, justifyContent: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(237, 240, 255, 0.95)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  modalContent: { backgroundColor: '#FFF', padding: 30, borderRadius: 40, width: '100%', alignItems: 'center' },
  modalHeader: { fontSize: 14, fontWeight: '800', color: '#005DA7', textTransform: 'uppercase', marginBottom: 10 },
  modalDoneBtn: { width: '100%', alignItems: 'center', padding: 20, backgroundColor: '#005DA7', borderRadius: 25, marginTop: 20 },
  modalDoneText: { color: '#FFF', fontWeight: '800', textTransform: 'uppercase' }
});