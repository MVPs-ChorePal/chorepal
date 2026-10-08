// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, 
  ActivityIndicator, SafeAreaView, TouchableOpacity, Dimensions 
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [chores, setChores] = useState([]); //stores chores from database
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchInitialData();

    //realtime listener to update cards automatically
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, () => {
        fetchInitialData(); //refreshes list when a photo is submitted
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  //handles initial session check and data fetch
  async function fetchInitialData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { 
      router.replace('/login-page');
      return; 
    }

    //fetch user display name
    const { data: userProfile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', session.user.id)
      .single();
    
    if (userProfile) {
      setUserName(userProfile.display_name.split(' ')[0]);
    }

    //fetch chores assigned to child
    const { data: choresData, error } = await supabase
      .from('chores')
      .select('*')
      .eq('assigned_to', session.user.id)
      .neq('status', 'approved') //show everything not yet approved
      .order('due_date', { ascending: true });

    if (error) {
      console.error("chore fetch error:", error.message);
    } else {
      setChores(choresData || []);
    }
    
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login-page');
  };

  if (loading) return (
    <View style={[styles.container, styles.center]}>
      <ActivityIndicator color="#005DA7" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mainWrapper}>
        
        {/* top */}
        <View style={styles.topSection}>
          <Text style={styles.greeting}>hi, {userName.toLowerCase()}</Text>
          <Text style={styles.title}>to-do list</Text>
        </View>

        {/* the chores list */}
        <View style={styles.middleSection}>
          <FlatList
            data={chores}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.choreCard}
                onPress={() => router.push(`/chores/${item.id}`)}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="flash-outline" size={20} color="#005DA7" />
                  </View>
                  <View>
                    <Text style={styles.choreName}>{item.title.toLowerCase()}</Text>
                    <Text style={styles.choreReward}>{item.reward_amount} pts</Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  (item.status === 'pending' || item.status === 'completed') && { backgroundColor: '#FFF9C4' },
                  item.status === 'approved' && { backgroundColor: '#E8F5E9' },
                ]}>
                  <Text style={[
                    styles.statusText,
                    (item.status === 'pending' || item.status === 'completed') && { color: '#FBC02D' },
                    item.status === 'approved' && { color: '#43A047' },
                  ]}>
                    {item.status === 'todo' ? 'to-do' : item.status}
                  </Text>
                <Ionicons name="chevron-forward" size={14} color="#BDC4D4" style={{marginLeft: 5}}/>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>all caught up</Text>
                <Text style={styles.emptySub}>no pending chores assigned.</Text>
              </View>
            }
          />
        </View>

        {/* utility actions */}
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
  mainWrapper: { flex: 1, paddingHorizontal: 30, paddingTop: 30 },
  
  //top styles
  topSection: { marginBottom: 30 },
  greeting: { fontSize: 16, color: '#005DA7', fontWeight: '300' },
  title: { fontSize: 32, fontWeight: '800', color: '#1A234E', letterSpacing: -1 },

  //list styles
  middleSection: { flex: 1 },
  listPadding: { paddingBottom: 100 },
  choreCard: {
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#EDF0FF', justifyContent: 'center', alignItems: 'center' },
  choreName: { fontSize: 16, fontWeight: '700', color: '#1A234E' },
  choreReward: { fontSize: 13, color: '#005DA7', fontWeight: '600', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#EDF0FF' },
  statusText: { fontSize: 10, fontWeight: '800', color: '#005DA7', textTransform: 'uppercase' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: '300', color: '#1A234E' },
  emptySub: { fontSize: 14, color: '#AAA', marginTop: 5 },
  bottomSection: { alignItems: 'center', paddingBottom: 20 },
  logoutText: { color: '#BDC4D4', fontSize: 13, textDecorationLine: 'underline', fontWeight: '300' }
});