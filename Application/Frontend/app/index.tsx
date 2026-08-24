import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import { supabase } from '../utils/supabase';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const router = useRouter();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    //logo spin
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      })
    ).start();

    const checkCache = async () => {
      try {
        //2s delay loading screen
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        //if session exixts, check role and route accordingly
        if (sessionError || !session) {
          console.log("no session found, clearing cache");
          await supabase.auth.signOut(); //clear cache
          router.replace('/login-page');
          return;
        }

        //if session exists, fetch user role
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, account_owner_id')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.log("error fetching profile, redirecting to signup");
          router.replace('/signup-page');
          return;
        }

        //routing logic
        if (profile.role === 'parent') {
          router.replace('/(parent)/home');
        } else {
          //if child hasn't joined a family yet, send to join page
          if (!profile.account_owner_id) router.replace('/(child)/home');
          else router.replace('/child-join');
        }
      } catch (err) {
        console.error("error checking session:", err);
        router.replace('/login-page');
      }
    };

    void checkCache();
  }, []);

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.Image
        source={require('../assets/images/favicon.png')}
        style={[styles.logo, { transform: [{ rotate: spin }] }]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  logo: { width: 50, height: 50, resizeMode: 'contain' }
});