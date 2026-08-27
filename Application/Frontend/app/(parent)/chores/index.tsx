import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChoresList() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>chore management</Text>
      <View style={styles.content}>
        <Text style={styles.placeholder}>chores information</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0FF', padding: 25 },
  title: { fontSize: 24, fontWeight: '300', color: '#005DA7', letterSpacing: -1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#BDC4D4', fontWeight: '300' }
});