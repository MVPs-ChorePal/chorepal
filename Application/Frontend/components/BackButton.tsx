import { router, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { colors } from '../constants/theme';

export interface BackButtonProps {
  // Where to go when there's no navigation history to pop (e.g. the screen
  // was reached via a deep link) - same canGoBack()-guarded fallback pattern
  // used elsewhere in the app (create-chore's post-submit nav, the child
  // chore detail's "Collect my coins" button).
  fallbackHref?: Href;
}

export default function BackButton({ fallbackHref = '/' }: BackButtonProps) {
  // DIAGNOSTIC: the icon has vanished intermittently even after switching
  // from an SVG-based icon (@tabler/icons-react-native) to this font-glyph
  // one, so it isn't specific to either icon library - logging every render
  // to find out whether BackButton even mounts when it happens, and how often.
  console.log(`[back-button] rendering, fallbackHref=${fallbackHref}`);

  const handlePress = () => {
    router.canGoBack() ? router.back() : router.replace(fallbackHref);
  };

  return (
    <Button
      testID="back-button"
      onPress={handlePress}
      title=""
      icon={<Ionicons name="chevron-back" size={22} color={colors.text.primary} />}
      color='secondary'
      size="small"
      style={{ width: 50 }}
    />
  );
}
