import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography, radius, spacing } from '../constants/theme';
import Coin from './Coin';
import { ChoreHeroProps } from './ChoreHero';

// Source of truth: Figma "Wireframes" > Chore Hero
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=656-18

export interface ChoreCardProps {
  title?: string;
  reward_amount?: number;
  category?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  style?: StyleProp<ViewStyle>;
}

export default function ChoreCard({ title, reward_amount, category, status, style }: ChoreCardProps) {
  return (
    <View style={style}>
      <Text style={typography.h3}>{title}</Text>
      <Coin/>
      <Text style={typography.body}>{reward_amount}</Text>
      {category && <Text style={typography.body}>{category}</Text>}
      {status && (
        <Text>
          {status}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
})