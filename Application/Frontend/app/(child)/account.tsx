import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';

export default function ChildAccount() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Account</Text>
      <View style={styles.content}>
        <Text style={styles.placeholder}>personal stats</Text>
      </View>
      <TouchableOpacity 
        onPress={() => supabase.auth.signOut().then(() => router.replace('/login-page'))}
        style={styles.logoutButton}
      >
        <Text style={styles.logoutText}>logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(child)/_layout.tsx).
  root: { flex: 1, gap: spacing.xl },
  title: { ...typography.display},
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: colors.text.tertiary, fontWeight: '300' },
  logoutButton: { alignItems: 'center', marginBottom: 70 },
  logoutText: { color: colors.brand.primary, textDecorationLine: 'underline', fontWeight: '300' }
});