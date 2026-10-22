import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography, radius, spacing } from '../constants/theme';
import Star from './Star';

// Source of truth: Figma "Wireframes" > Chore Hero
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=656-18

export interface ChoreHeroProps {
  numOfChores: number;
  // Total chores for the day, used to size the progress bar. Defaults to
  // numOfChores (an empty bar) when omitted.
  totalChores?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ChoreHero({ numOfChores = 0, totalChores, style }: ChoreHeroProps) {
  const total = totalChores ?? numOfChores;
  const progress = total > 0 ? Math.min(1, Math.max(0, (total - numOfChores) / total)) : 1;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.ledge} />
      <View style={styles.root}>
        <Star size={92} />
        <View style={styles.content}>
          <Text style={[typography.body, styles.label]}>Daily chores</Text>
          <Text style={typography.h2}>
            {numOfChores === 0 ? 'All done!' : numOfChores === 1 ? '1 chore to go!' : `${numOfChores} chores to go!`}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  // A hard, unblurred ledge behind the card, same technique as Button's shadow.
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.status.pending,
    transform: [{ translateY: 6 }],
  },
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.status.warning,
    borderRadius: radius.card,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  label: { color: colors.status.warningText },
  progressTrack: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surface.white,
    overflow: 'hidden',
  },
  progressFill: {
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.status.success,
  },
})
