import { Share, Platform } from 'react-native';
import { showAlert } from './alert';

// Share.share() isn't implemented in most browsers on web - it throws
// instead of silently no-op'ing like Alert.alert does. Uses the Web Share
// API where available, falling back to copying to the clipboard.
export async function showShare(message: string) {
  if (Platform.OS !== 'web') {
    Share.share({ message });
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text: message });
    } catch {
      // user cancelled the share sheet - not an error
    }
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(message);
    showAlert('copied', 'the code was copied to your clipboard');
  }
}
