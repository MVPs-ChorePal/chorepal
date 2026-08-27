import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'expo-router';

export default function ChildAccount() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>account</Text>
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
  container: { flex: 1, backgroundColor: '#EDF0FF', padding: 25 },
  title: { fontSize: 24, fontWeight: '300', color: '#FFD700', letterSpacing: -1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#BDC4D4', fontWeight: '300' },
  logoutButton: { alignItems: 'center', marginBottom: 70 },
  logoutText: { color: '#FFD700', textDecorationLine: 'underline', fontWeight: '300' }
});