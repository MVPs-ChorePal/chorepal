import { router } from 'expo-router';
import Button from './Button';
import { IconChevronLeft } from '@tabler/icons-react-native';

export default function BackButton() {
  return (
    <Button onPress={() => router.back()} title="" icon={<IconChevronLeft />} color='secondary' size="small" style={{ width: 50 }} />
  );
}
