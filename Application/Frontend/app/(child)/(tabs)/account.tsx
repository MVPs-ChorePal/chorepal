import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconLock, IconLogout2 } from '@tabler/icons-react-native';
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

  // Reuses the forgot-password flow in child mode (username -> reset code
  // sent to the parent's inbox -> new password), with the child's username
  // pre-filled. push (not replace) so back returns here.
  const handleChangePassword = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = session
      ? await supabase.from('users').select('username').eq('id', session.user.id).single()
      : { data: null };
    router.push({
      pathname: '/forgot-password',
      params: { role: 'child', username: profile?.username ?? '' },
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <ChildHeader left={`Account`} />
      <View style={styles.settings}>
        <SettingsCard
          items={[
            {
              icon: <IconLock size={20} color={colors.category.other.base} />,
              iconBg: colors.category.other.subtle,
              label: 'Change password',
              onPress: handleChangePassword,
            },
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
