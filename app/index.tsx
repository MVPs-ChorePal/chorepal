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
      //2s delay so user sees loading screen
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (profile?.role === 'parent') router.replace('/parent-dashboard');
        else if (profile?.role === 'child') router.replace('/child-join');
        else router.replace('/signup-page');
      } else {
        router.replace('/signup-page');
      }
    };
    checkCache();
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