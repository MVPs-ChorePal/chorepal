import { Stack } from 'expo-router';
import { screen } from '../../constants/theme';
import BottomNavBar from '../../components/BottomNavBar';
import { PARENT_TABS } from '../../constants/tabs';

// (tabs) holds the 4 real tab screens (home/chores/rewards/account). This
// Stack wraps it so chores/create-chore and chores/[id] can be ordinary
// pushed screens that sit on top of the tab bar instead of living inside the
// Tabs navigator - Expo Router 58 made `href: null` Tabs.Screen routes
// unreachable via router.push (it redirects back to the initial tab), so
// they can no longer be registered as hidden tabs the way they used to be.
//
// BottomNavBar is rendered here, as a sibling of the Stack, rather than by
// the Tabs navigator itself - that keeps the floating bar visible on
// chores/create-chore and chores/[id] too, instead of disappearing along
// with the rest of the (tabs) screen whenever one of those is pushed on top.
export default function ParentLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: screen,
        }}
      >
        {/* (tabs) applies `screen` per-tab via sceneStyle instead - resetting
            it here keeps the floating tab bar edge-to-edge instead of being
            inset by the outer margins. */}
        <Stack.Screen name="(tabs)" options={{ contentStyle: { flex: 1 } }} />
      </Stack>
      <BottomNavBar basePath="/(parent)/(tabs)" tabs={PARENT_TABS} />
    </>
  );
}
