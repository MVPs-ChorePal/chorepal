import React, { useCallback, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../utils/supabase';
import { typography } from '../constants/theme';
import CoinBadge from './CoinBadge';

// A child screen's top row: arbitrary content on the left (a greeting, a
// BackButton, ...) and the child's coin balance on the right. Self-fetches
// the balance (refetching on focus) so screens don't each re-derive the same
// query — pass `balance` to skip the fetch when a screen already has it.
export interface ChildHeaderProps {
  left?: React.ReactNode;
  balance?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ChildHeader({ left, balance, style }: ChildHeaderProps) {
  const [fetchedBalance, setFetchedBalance] = useState(0);
  const shouldFetch = balance === undefined;

  useFocusEffect(
    useCallback(() => {
      if (!shouldFetch) return;
      let cancelled = false;

      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase.from('users').select('current_balance').eq('id', session.user.id).single();
        if (!cancelled) setFetchedBalance(Number(data?.current_balance || 0));
      })();

      return () => { cancelled = true; };
    }, [shouldFetch])
  );

  return (
    <View style={[styles.row, style]}>
      {typeof left === 'string' ? <Text style={typography.display}>{left}</Text> : left}
      <CoinBadge amount={shouldFetch ? fetchedBalance : balance!} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
