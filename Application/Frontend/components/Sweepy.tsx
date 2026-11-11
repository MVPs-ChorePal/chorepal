import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

// Source of truth: Figma "Mascot / Sweepy (broom)"
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=713-7
// Converted 1:1 from the exported asset (assets/images/sweepy.svg). Colors are
// the mascot's own artwork, kept as raw hex rather than mapped to theme
// tokens - several happen to match status/category tokens, but changing
// those tokens shouldn't recolor the mascot.

const ASPECT = 300 / 220; // height / width of the artwork

export interface SweepyProps {
  // Rendered width; height follows the artwork's 220x300 proportions.
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Sweepy({ size = 220, style }: SweepyProps) {
  return (
    <Svg width={size} height={size * ASPECT} viewBox="0 0 220 300" fill="none" style={style}>
      <G>
        {/* Handle */}
        <Rect x={102.5} y={1.5} width={15} height={147} rx={7.5} fill="#D9A066" strokeWidth={3} stroke="#A8713A" />
        {/* Bristles */}
        <Path
          d="M60 150H160L190 262C183.333 274 176.667 274 170 262C163.333 274 156.667 274 150 262C143.333 274 136.667 274 130 262C123.333 274 116.667 274 110 262C103.333 274 96.6667 274 90 262C83.3333 274 76.6667 274 70 262C63.3333 274 56.6667 274 50 262C43.3333 274 36.6667 274 30 262L60 150Z"
          fill="#FFC940"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="#E0A800"
        />
        {/* Bristle lines */}
        <Path d="M80 226L70 260M140 226L150 260M110 228V256" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" stroke="#E0A800" />
        {/* Band */}
        <Rect x={74} y={142} width={72} height={20} rx={8} fill="#FF6FA3" strokeWidth={4} stroke="#D94C80" />
        {/* Eyes */}
        <Ellipse cx={92} cy={196} rx={7} ry={9} fill="#2B2340" />
        <Circle cx={93.5} cy={191.5} r={2.5} fill="white" />
        <Ellipse cx={128} cy={196} rx={7} ry={9} fill="#2B2340" />
        <Circle cx={129.5} cy={191.5} r={2.5} fill="white" />
        {/* Cheeks */}
        <Ellipse cx={74} cy={213} rx={9} ry={5} fill="#FF6FA3" fillOpacity={0.55} />
        <Ellipse cx={146} cy={213} rx={9} ry={5} fill="#FF6FA3" fillOpacity={0.55} />
        {/* Mouth */}
        <Path
          d="M123 210C123 211.313 122.664 212.614 122.01 213.827C121.357 215.04 120.4 216.142 119.192 217.071C117.985 218 116.552 218.736 114.975 219.239C113.398 219.741 111.707 220 110 220C108.293 220 106.602 219.741 105.025 219.239C103.448 218.736 102.015 218 100.808 217.071C99.6004 216.142 98.6429 215.04 97.9896 213.827C97.3363 212.614 97 211.313 97 210L110 210H123Z"
          fill="#2B2340"
        />
        {/* Arms + hands */}
        <Path d="M50 198C39.3333 191.333 32 180 28 164" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" stroke="#2B2340" />
        <Circle cx={28} cy={164} r={6.5} fill="#2B2340" />
        <Path d="M172 194C184 199.333 192 209.333 196 224" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" stroke="#2B2340" />
        <Circle cx={196} cy={224} r={6.5} fill="#2B2340" />
        {/* Sparkles */}
        <Path d="M183 30L186.217 39.7827L196 43L186.217 46.2173L183 56L179.783 46.2173L170 43L179.783 39.7827L183 30Z" fill="#FFC940" />
        <Path d="M39 60L41.2274 66.7726L48 69L41.2274 71.2274L39 78L36.7726 71.2274L30 69L36.7726 66.7726L39 60Z" fill="#FF6FA3" />
      </G>
    </Svg>
  );
}
