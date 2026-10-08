import { Alert, Platform } from 'react-native';

// Alert.alert has no visual implementation on react-native-web - it
// silently does nothing. Falls back to window.alert there instead.
export function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
