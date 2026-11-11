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
  const handlePress = () => {
    router.canGoBack() ? router.back() : router.replace(fallbackHref);
  };

  return (
    <Button
      testID="back-button"
      onPress={handlePress}
      title=""
      // Ionicons renders as a font glyph, not an SVG (unlike @tabler/icons-
      // react-native) - avoids a reported class of icon-disappearing-on-
      // remount issue tied to SVG-based icons.
      icon={<Ionicons name="chevron-back" size={22} color={colors.text.primary} />}
      color='secondary'
      size="small"
      style={{ width: 50 }}
    />
  );
}
