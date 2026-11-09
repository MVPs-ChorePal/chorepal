import { Tabs, useSegments } from 'expo-router';
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { Icon } from '@tabler/icons-react-native';
import { colors, typography, radius, spacing, screen } from '../constants/theme';

// Source of truth: Figma "Design System" > Bottom Nav (Child) — shared by both
// (child)/(tabs)/_layout.tsx and (parent)/(tabs)/_layout.tsx so the two roles
// stay visually identical; each still needs its own thin _layout.tsx file
// (Expo Router resolves layouts by file location), they just both render this.
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=558-3

// Whether the active tab's icon+label pill fits its slot depends on the
// label itself ("Me" needs far less room than "Rewards"), not just overall
// screen width. When it doesn't fit, the icon alone is the fallback (not
// the label alone) - a fixed 22px icon always fits, where text width is
// much harder to get right (and getting it wrong means clipped letters,
// not just an icon shown one tab earlier than strictly necessary). These
// constants mirror the actual pill/tab-bar styles below, so the estimate
// tracks them if those ever change.
const ICON_SIZE = 22;
const PILL_GAP = spacing.sm;
const PILL_HORIZONTAL_PADDING = spacing.lg; // pillActive, each side
const BAR_HORIZONTAL_PADDING = spacing.lg; // tabBar, each side
// No real text-measurement API available here without a second render
// pass, so this estimates each label's rendered width from its character
// count - tuned for Nunito Bold at typography.body's 16px.
const AVG_CHAR_WIDTH = 9.5;

const TabItem = ({ label, icon: TabIcon, isActive, fits }: { label: string; icon: Icon; isActive: boolean; fits: boolean }) => {
  const showLabel = isActive && fits;
  return (
    <View style={styles.itemWrap}>
      {isActive && <View pointerEvents="none" style={styles.ledge} />}
      <View style={[styles.pill, isActive && styles.pillActive]}>
        <TabIcon size={22} color={isActive ? colors.icon.inverse : colors.icon.secondary} />
        {showLabel && <Text style={styles.tabLabel}>{label}</Text>}
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
}

export default function AppTabsLayout({ tabs }: AppTabsLayoutProps) {
  const segments = useSegments();
  const { width } = useWindowDimensions();

  //available width per tab assumes the bar divides it equally among all
  //tabs (the default react-navigation bottom-tab behavior here, since
  //tabBarItemStyle doesn't override flex/width)
  const availablePerTab = (width - BAR_HORIZONTAL_PADDING * 2) / tabs.length;
  const fitsWithIcon = (label: string) =>
    ICON_SIZE + PILL_GAP + label.length * AVG_CHAR_WIDTH + PILL_HORIZONTAL_PADDING * 2 <= availablePerTab;

  //chores/[id] lives outside this Tabs navigator (a sibling Stack screen,
  //see (parent|child)/_layout.tsx) and has no tab of its own, so its tab
  //icon has to stay lit via the 'chores' segment appearing anywhere in the
  //path, not a fixed index - its depth differs from chores/index's.
  const isChoresActive = (segments as string[]).includes('chores');

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
              ? () => <TabItem label={tab.label} icon={tab.icon} isActive={isChoresActive} fits={fitsWithIcon(tab.label)} />
              : ({ focused }) => <TabItem label={tab.label} icon={tab.icon} isActive={focused} fits={fitsWithIcon(tab.label)} />,
          }}
        />
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
    // A few px taller than the design spec's 74 - on-device (iOS native,
    // not web) the custom Nunito font's natural glyph height runs taller
    // than its line-height suggests, and the tight original budget clipped
    // the active tab's label once the icon (which used to set the row's
    // height) was hidden on a narrow tab.
    height: 84,
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
    // Pinned rather than left to the font's default metrics: the pill's
    // available vertical room (~22px, set by the tab bar's fixed height)
    // used to always be governed by the 22px icon sitting next to this
    // text. With the icon hidden (fits === false), the pill's height
    // falls back to the text's own natural line-height - which for this
    // custom display font runs taller than that budget, so it overflowed
    // and got clipped by the tab bar.
    lineHeight: 20,
  },
});
