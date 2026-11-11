import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconLogout2 } from '@tabler/icons-react-native';
import { supabase } from '../../../utils/supabase';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';
import ChildHeader from '../../../components/ChildHeader';
import SettingsCard from '../../../components/SettingsCard';

export default function ChildAccount() {
  const router = useRouter();
  // dismissAll first (guarded by canDismiss, else it logs a dev-only
  // warning when there's nothing to dismiss) - see (parent)/(tabs)/account.tsx's
  // handleLogout for why
  const handleLogout = () => supabase.auth.signOut().then(() => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login-page');
  });

  return (
    <SafeAreaView style={styles.root}>
      <ChildHeader left={`Account`} />
      <View style={styles.content}>
        <Text style={styles.placeholder}>personal stats</Text>
      </View>
      <View style={styles.settings}>
        <SettingsCard
          items={[
            {
              icon: <IconLogout2 size={20} color={colors.text.secondary} />,
              iconBg: 'rgba(122,111,143,0.15)',
              label: 'Log out',
              onPress: handleLogout,
            },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(child)/_layout.tsx).
  root: { flex: 1, gap: spacing.xl },
  title: { ...typography.display},
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: colors.text.tertiary, fontWeight: '300' },
  // Clears the floating bottom nav bar (BottomNavBar.tsx), which overlays the screen.
  settings: { marginBottom: 100 },
});
