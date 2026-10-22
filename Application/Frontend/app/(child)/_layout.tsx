import { Tabs, useSegments } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';

import { Icon, IconHome, IconListCheck, IconUser, IconTreasureChest } from '@tabler/icons-react-native';

import { colors, typography, radius, spacing, screen } from '../../constants/theme';

// Source of truth: Figma "Design System" > Bottom Nav (Child)
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=558-3

const ChildTabItem = ({ label, icon: TabIcon, isActive }: { label: string; icon: Icon; isActive: boolean }) => {
  return (
    <View style={styles.itemWrap}>
      {isActive && <View pointerEvents="none" style={styles.ledge} />}
      <View style={[styles.pill, isActive && styles.pillActive]}>
        <TabIcon size={22} color={isActive ? colors.icon.inverse : colors.icon.secondary} />
        {isActive && <Text style={styles.tabLabel}>{label}</Text>}
      </View>
    </View>
  );
};

export default function ChildLayout() {
  const segments = useSegments();

  //check if the user is in the 'chores' folder
  const isChoresActive = segments[1] === 'chores';

  return (
    <Tabs screenOptions={{
      headerShown: false,
      animation: 'none',
      tabBarShowLabel: false,
      tabBarStyle: styles.tabBar,
      sceneStyle: screen,
      tabBarItemStyle: {
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      },
      tabBarIconStyle: {
        width: '100%',
        height: '100%',
        marginTop: 0,
      }
    }}>
      <Tabs.Screen name="home" options={{
        tabBarIcon: ({ focused }) => <ChildTabItem label="Home" icon={IconHome} isActive={focused} />
      }} />

      <Tabs.Screen name="chores/index" options={{
        title: 'chores',
        tabBarIcon: () => <ChildTabItem label="Chores" icon={IconListCheck} isActive={isChoresActive} />
      }} />

      <Tabs.Screen name="rewards" options={{
        tabBarIcon: ({ focused }) => <ChildTabItem label="Rewards" icon={IconTreasureChest} isActive={focused} />
      }} />
      <Tabs.Screen name="account" options={{
        tabBarIcon: ({ focused }) => <ChildTabItem label="Me" icon={IconUser} isActive={focused} />
      }} />

      <Tabs.Screen name="chores/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderBottomWidth: 0,
    height: 74,
    borderTopLeftRadius: radius.medium,
    borderTopRightRadius: radius.medium,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  itemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The Figma "ledge" shadow is a hard, unblurred 4px offset duplicate of the
  // pill shape, not a soft native shadow — so it's drawn as a real layer
  // behind the pill rather than via shadowColor/elevation (see Button.tsx).
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.button,
    backgroundColor: colors.brand.primaryShadow,
    transform: [{ translateY: 4 }],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.button,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  pillActive: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
  },
  tabLabel: {
    ...typography.body,
    color: colors.text.inverse,
  },
});
