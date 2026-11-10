import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconChevronRight } from '@tabler/icons-react-native';
import { colors, typography } from '../../constants/theme';
import CoinLabel from '../CoinLabel';

// Source of truth: Figma "Parent Account" > My kids > row
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=710-95

export interface KidRowProps {
  name: string;
  avatarColor: string;
  balance: number;
}

export default function KidRow({ name, avatarColor, balance }: KidRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={[typography.h3, styles.name]} numberOfLines={1}>{name}</Text>
      <CoinLabel amount={balance} size={16} />
      <IconChevronRight size={14} color={colors.text.tertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...typography.h3, color: colors.text.inverse },
  name: { flex: 1 },
});
