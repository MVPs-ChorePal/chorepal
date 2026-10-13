import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../../constants/theme';

export default function ChoresList() {
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>chore management</Text>
      <View style={styles.content}>
        <Text style={styles.placeholder}>chores information</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Background + top/side margins come from the Tabs' sceneStyle (app/(child)/_layout.tsx).
  root: { flex: 1, gap: spacing.xl },
  title: { ...typography.h2, color: colors.brand.primary, letterSpacing: -1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: colors.text.tertiary, fontWeight: '300' }
});