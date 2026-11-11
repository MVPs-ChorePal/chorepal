// @ts-nocheck
import React, { useState, useEffect, useId } from 'react';
import { 
  StyleSheet, Text, View, FlatList, 
  ActivityIndicator, SafeAreaView, TouchableOpacity, Dimensions 
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';

import ChildHeader from '../../../components/ChildHeader';
import ChoreHero from '../../../components/ChoreHero';
import Chore from '../../../components/Chore';
import { categoryForTag } from '../../../constants/choreCategories';



const { width } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [chores, setChores] = useState([]); //stores chores from database
  const [userName, setUserName] = useState('');
  const instanceId = useId();

  useEffect(() => {
    fetchInitialData();

    //realtime listener to update cards automatically - a channel name
    //unique to this mount, so a Fast Refresh re-run during dev can't try to
    //re-subscribe under the same name as a not-yet-cleaned-up previous one
    //(Supabase throws if you .on() a channel that's already subscribed)
    const channel = supabase
      .channel(`chores-changes-child-${instanceId}`)
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
        
        <ChildHeader left={`Hi, ${userName}!`} />

        <View>
          {/* PLACEHOLDER */}
          <ChoreHero numOfChores={chores.length} totalChores={chores.length} />
        </View>

        {/* the chores list */}
        <View style={styles.middleSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={typography.h2}>Today's Chores</Text>
            <TouchableOpacity onPress={() => router.push('/chores')}>
              <Text style={{ ...typography.body, color: colors.brand.primary }}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listWrap}>
            <FlatList
              data={chores}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Chore
                  title={item.title}
                  reward_amount={item.reward_amount}
                  status={item.status}
                  category={categoryForTag(item.target_label)}
                  onPress={() => router.push(`/chores/${item.id}`)}
                />

              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={{...typography.bodyTertiary}}>No chores yet</Text>
                </View>
              }
            />
          </View>
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
  middleSection: { flex: 1 },
  // flex: 1 bounds the FlatList to the space left on screen - without it the
  // wrapper grows to fit every chore, so the list has nothing to scroll and
  // the bottom chores get clipped off-screen.
  listWrap: { flex: 1 },
  list: { paddingBottom: spacing.xl, gap: spacing.xl },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { ...typography.body },
});