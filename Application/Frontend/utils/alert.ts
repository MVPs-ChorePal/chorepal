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

// Same web gap as showAlert, but for a Cancel/Confirm choice - resolves to
// whether the user confirmed, instead of taking an onPress callback, so it
// works the same way on both platforms.
export function showConfirm(title: string, message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
