import { Tabs } from 'expo-router';
import { screen } from '../constants/theme';
import { TabConfig } from '../constants/tabs';

// Handles routing/mounting for the 4 real tab screens (home/chores/rewards/
// account). Its own tab bar is hidden — BottomNavBar renders the floating
// pill bar instead, at the role's top-level Stack, so it stays visible on
// screens pushed outside this Tabs navigator too (see app/(parent)/_layout.tsx
// and app/(child)/_layout.tsx).
export interface AppTabsLayoutProps {
  tabs: TabConfig[];
}

export default function AppTabsLayout({ tabs }: AppTabsLayoutProps) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarStyle: { display: 'none' },
        sceneStyle: screen,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
