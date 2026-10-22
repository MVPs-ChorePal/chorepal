import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { colors } from '../constants/theme';

// Source of truth: Figma "Wireframes" > Chore Hero > Mascot placeholder (Sparky)
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=656-19

export interface StarProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Star({ size = 92, style }: StarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 92 92" fill="none" style={style}>
      <Path
        d="M37.7122 13.2086C41.5862 7.03446 50.5518 6.94596 54.5469 13.0425L60.514 22.1482C61.9238 24.2996 64.1084 25.825 66.6138 26.4074L73.7602 28.0686C81.0556 29.7645 83.9659 38.5832 79.1129 44.2882L75.4212 48.6281C73.8829 50.4365 73.0381 52.7333 73.0381 55.1075V67.9838C73.0381 75.18 65.6656 80.0205 59.0626 77.1596L49.9755 73.2225C47.4391 72.1235 44.5608 72.1235 42.0244 73.2225L32.9375 77.1596C26.3344 80.0205 18.9619 75.18 18.9619 67.9838V55.1075C18.9619 52.7333 18.1172 50.4365 16.5788 48.6281L12.9551 44.3681C8.08599 38.6442 11.0338 29.7959 18.3629 28.1359L25.9471 26.418C28.5414 25.8304 30.7948 24.2333 32.2086 21.98L37.7122 13.2086Z"
        fill={colors.brand.primary}
        stroke={colors.brand.primaryShadow}
        strokeWidth={6}
      />
      <Ellipse cx={37} cy={42} rx={4} ry={5.5} fill={colors.icon.primary} />
      <Ellipse cx={55} cy={42} rx={4} ry={5.5} fill={colors.icon.primary} />
      <Path
        d="M54.598 55.2731C54.0299 56.4975 52.8887 57.5684 51.3415 58.329C49.7943 59.0896 47.9224 59.5 46 59.5C44.0776 59.5 42.2057 59.0896 40.6585 58.329C39.1113 57.5684 37.9701 56.4975 37.402 55.2731L39.9814 54.7412C40.3791 55.5982 41.1779 56.3479 42.261 56.8803C43.344 57.4127 44.6543 57.7 46 57.7C47.3457 57.7 48.656 57.4127 49.739 56.8803C50.8221 56.3479 51.6209 55.5982 52.0186 54.7412L54.598 55.2731Z"
        fill={colors.icon.primary}
      />
    </Svg>
  );
}
