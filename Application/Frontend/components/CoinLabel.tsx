import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { colors, typography } from '../constants/theme';
import Coin from './Coin';

// Source of truth: Figma "Parent Rewards" > Approval card > Coin + amount
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=708-76

export interface CoinLabelProps {
  amount: number;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function CoinLabel({ amount, size = 16, color = colors.text.primary, style }: CoinLabelProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}>
      <Coin size={Math.round(size * 1.2)} />
      <Text style={{ ...typography.body }}>
        {amount.toLocaleString()}
      </Text>
    </View>
  );
}
