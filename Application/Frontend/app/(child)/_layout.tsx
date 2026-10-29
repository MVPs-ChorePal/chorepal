import { IconHome, IconListCheck, IconTreasureChest, IconUser } from '@tabler/icons-react-native';
import AppTabsLayout from '../../components/AppTabsLayout';

export default function ChildLayout() {
  return (
    <AppTabsLayout
      tabs={[
        { name: 'home', label: 'Home', icon: IconHome },
        { name: 'chores/index', label: 'Chores', icon: IconListCheck },
        { name: 'rewards', label: 'Rewards', icon: IconTreasureChest },
        { name: 'account', label: 'Me', icon: IconUser },
      ]}
      hiddenRoutes={['chores/[id]']}
    />
  );
}
