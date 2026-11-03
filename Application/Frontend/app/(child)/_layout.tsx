import { Stack } from 'expo-router';
import { screen } from '../../constants/theme';

// (tabs) holds the 4 real tab screens (home/chores/rewards/account). This
// Stack wraps it so chores/[id] can be an ordinary pushed screen that sits
// on top of the tab bar instead of living inside the Tabs navigator - Expo
// Router 58 made `href: null` Tabs.Screen routes unreachable via
// router.push (it redirects back to the initial tab), so it can no longer
// be registered as a hidden tab the way it used to be.
export default function ChildLayout() {
  return (
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
  );
}
