import { Icon, IconHome, IconListCheck, IconTreasureChest, IconUser } from '@tabler/icons-react-native';

// Shared tab configs for the (parent) and (child) (tabs) groups — consumed by
// both AppTabsLayout.tsx (route registration) and BottomNavBar.tsx (the
// floating bar rendered at each role's top-level Stack).

export interface TabConfig {
  // Route name under the (tabs) group, e.g. "home" or "chores/index".
  name: string;
  label: string;
  icon: Icon;
}

export const PARENT_TABS: TabConfig[] = [
  { name: 'home', label: 'Home', icon: IconHome },
  { name: 'chores/index', label: 'Chores', icon: IconListCheck },
  { name: 'rewards', label: 'Rewards', icon: IconTreasureChest },
  { name: 'account', label: 'Account', icon: IconUser },
];

export const CHILD_TABS: TabConfig[] = [
  { name: 'home', label: 'Home', icon: IconHome },
  { name: 'chores/index', label: 'Chores', icon: IconListCheck },
  { name: 'rewards', label: 'Rewards', icon: IconTreasureChest },
  { name: 'account', label: 'Me', icon: IconUser },
];
