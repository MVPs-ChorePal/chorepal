import { router, Href } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
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
      // color must be explicit: Tabler's default is "currentColor", which only
      // resolves on web - on iOS/Android it leaves the arrow invisible.
      icon={<IconChevronLeft size={24} color={colors.text.primary} />}
      color='secondary'
      size="small"
      style={{ width: 50 }}
    />
  );
}
