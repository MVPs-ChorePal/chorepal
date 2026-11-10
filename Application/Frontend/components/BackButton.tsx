import { router, Href } from 'expo-router';
import Button from './Button';
import { IconChevronLeft } from '@tabler/icons-react-native';

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
    <Button testID="back-button" onPress={handlePress} title="" icon={<IconChevronLeft />} color='secondary' size="small" style={{ width: 50 }} />
  );
}
