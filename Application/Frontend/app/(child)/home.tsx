// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, 
  ActivityIndicator, SafeAreaView, TouchableOpacity, Dimensions 
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../../constants/theme';

import CoinBadge from '../../components/CoinBadge';
import CoinLabel from '../../components/CoinLabel';


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

  if (loading) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={colors.brand.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mainWrapper}>
        
        {/* Top, MIGHT CONVERT TO COMPONENT */}
        <View style={styles.topSection}>
          {/* NEED PROFILE PIC */}
          <Text style={styles.greeting}>Hi, {userName}!</Text>

          <CoinBadge amount={0} />
        </View>

        {/* the chores list */}
        <View style={styles.middleSection}>
          <FlatList
            data={chores}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.choreCard}
                onPress={() => router.push(`/chores/${item.id}`)}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="flash-outline" size={20} color={colors.brand.primary} />
                  </View>
                  <View>
                    <Text style={styles.choreName}>{item.title.toLowerCase()}</Text>
                    <CoinLabel amount={item.reward_amount} size={13} color={colors.brand.primary} style={{ marginTop: 2 }} />
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  item.status === 'pending' && { backgroundColor: colors.status.warningSubtle },
                  (item.status === 'approved' || item.status === 'completed') && { backgroundColor: colors.status.successSubtle },
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'pending' && { color: colors.status.warningText },
                    (item.status === 'approved' || item.status === 'completed') && { color: colors.status.successText },
                  ]}>
                    {item.status === 'todo' ? 'to-do' : item.status}
                  </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.icon.secondary} style={{marginLeft: 5}}/>
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

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(child)/_layout.tsx).
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  mainWrapper: { flex: 1, gap: spacing.xl },

  //top styles
  topSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { ...typography.h2},
  title: { ...typography.h1, color: colors.text.primary, letterSpacing: -1 },

  //list styles
  middleSection: { flex: 1 },
  list: { paddingBottom: spacing.xl, gap: spacing.xl },
  choreCard: {
    backgroundColor: colors.surface.white,
    borderRadius: radius.card,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 45, height: 45, borderRadius: radius.full, backgroundColor: colors.surface.neutral, justifyContent: 'center', alignItems: 'center' },
  choreName: { ...typography.bodyMediumStrong, color: colors.text.primary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.small, backgroundColor: colors.surface.neutral },
  statusText: { ...typography.captionStrong, color: colors.brand.primary, textTransform: 'uppercase' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: '300', color: colors.text.primary },
  emptySub: { fontSize: 14, color: colors.text.tertiary, marginTop: 5 },
});