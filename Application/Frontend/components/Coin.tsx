import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../constants/theme';

// Source of truth: Figma "Design System" > Components (new design) > Coin
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=724-271

export interface CoinProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Coin({ size = 26, style }: CoinProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" style={style}>
      <Circle cx={13} cy={13} r={12} fill={colors.status.warning} stroke={colors.status.pending} strokeWidth={2} />
      <Path
        d="M13 5.2L14.6053 10.1405L19.8001 10.1405L15.5974 13.1939L17.2027 18.1345L13 15.0811L8.79734 18.1345L10.4026 13.1939L6.19995 10.1405L11.3947 10.1405L13 5.2Z"
        fill={colors.surface.white}
      />
    </Svg>
  );
}
