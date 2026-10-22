// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, 
  ActivityIndicator, SafeAreaView, TouchableOpacity, Dimensions 
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';

import CoinBadge from '../../components/CoinBadge';
import ChoreHero from '../../components/ChoreHero';
import Chore from '../../components/Chore';


const { width } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [chores, setChores] = useState([]); //stores chores from database
  const [userName, setUserName] = useState('');
  
  const testChores = [
    { id: 1, title: 'Clean your room', reward_amount: 10, status: 'todo', category: 'clean' },
    { id: 2, title: 'Do the dishes', reward_amount: 15, status: 'pending', category: 'kitchen' },
    { id: 4, title: 'Mow the lawn', reward_amount: 20, status: 'todo', category: 'outdoor' },
    { id: 5, title: 'Walk the dog', reward_amount: 8, status: 'todo' },
    { id: 6, title: 'Feed the cat', reward_amount: 6, status: 'pending', category: 'other' },
  ]

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

        <View>
          {/* PLACEHOLDER */}
          <ChoreHero numOfChores={5} totalChores={10} />
        </View>

        {/* the chores list */}
        <View style={styles.middleSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={typography.h2}>Today's Chores</Text>
            <TouchableOpacity onPress={() => router.push('/chores')}>
              <Text style={{ ...typography.body, color: colors.brand.primary }}>See all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={testChores}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Chore
                title={item.title.toLowerCase()}
                reward_amount={item.reward_amount}
                status={item.status}
                category={item.category}
                onPress={() => router.push(`/chores/${item.id}`)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptySub}>You're all caught up!</Text>
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

  //list styles
  middleSection: { flex: 1 },
  list: { paddingBottom: spacing.xl, gap: spacing.xl },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { ...typography.body },
  emptySub: { ...typography.bodyTertiary, marginTop: 5 },
});