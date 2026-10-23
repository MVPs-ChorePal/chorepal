import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../constants/theme';

// Source of truth: Figma "Wireframes" > Child Chores > Status Tabs
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=657-36

export interface StatusTab<T extends string = string> {
  value: T;
  label: string;
}

export interface StatusTabsProps<T extends string = string> {
  tabs: StatusTab<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export default function StatusTabs<T extends string = string>({ tabs, value, onChange, style }: StatusTabsProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <View key={tab.value} style={styles.tabWrap}>
            {active && <View pointerEvents="none" style={styles.ledge} />}
            <TouchableOpacity style={[styles.tab, active && styles.activeTab]} onPress={() => onChange(tab.value)} activeOpacity={0.85}>
              <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 18,
    backgroundColor: colors.surface.neutral,
  },
  tabWrap: { flex: 1 },
  // Same hard, unblurred offset-shadow "ledge" technique as Button/Category, at the Figma spec's 3px offset.
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.small,
    backgroundColor: colors.shadow.ledge,
    transform: [{ translateY: 3 }],
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.small,
  },
  activeTab: { backgroundColor: colors.surface.white },
  label: { ...typography.body, fontSize: 16, color: colors.text.secondary },
  activeLabel: { color: colors.text.primary },
});
