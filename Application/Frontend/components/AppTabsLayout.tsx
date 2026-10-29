import { Tabs, useSegments } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { Icon } from '@tabler/icons-react-native';
import { colors, typography, radius, spacing, screen } from '../constants/theme';

// Source of truth: Figma "Design System" > Bottom Nav (Child) — shared by both
// (child)/_layout.tsx and (parent)/_layout.tsx so the two roles stay visually
// identical; each still needs its own thin _layout.tsx file (Expo Router
// resolves layouts by file location), they just both render this.
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=558-3

const TabItem = ({ label, icon: TabIcon, isActive }: { label: string; icon: Icon; isActive: boolean }) => {
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

export interface TabConfig {
  // Route name as Expo Router sees it, e.g. "home" or "chores/index".
  name: string;
  label: string;
  icon: Icon;
}

export interface AppTabsLayoutProps {
  // The 4 visible tabs, in display order.
  tabs: TabConfig[];
  // Additional routes that belong to this Tabs navigator but are hidden from
  // the bar (href: null) — e.g. "chores/[id]", "chores/create-chore".
  hiddenRoutes?: string[];
}

export default function AppTabsLayout({ tabs, hiddenRoutes = [] }: AppTabsLayoutProps) {
  const segments = useSegments();

  //check if the user is in the 'chores' folder — chores/[id] has no tab of
  //its own, so its tab icon has to stay lit via the parent 'chores' segment
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
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.name === 'chores/index' ? 'chores' : undefined,
            tabBarIcon: tab.name === 'chores/index'
              ? () => <TabItem label={tab.label} icon={tab.icon} isActive={isChoresActive} />
              : ({ focused }) => <TabItem label={tab.label} icon={tab.icon} isActive={focused} />,
          }}
        />
      ))}

      {hiddenRoutes.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
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
