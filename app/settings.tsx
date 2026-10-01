import appConfig from '../app.json';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { leaveScreen } from '@/features/workout/navigation';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

/** The app's settings, opened from the Profile tab. None yet: they come later. */
export default function SettingsScreen() {
  const router = useRouter();

  return (
    <Screen
      title="Settings"
      titleVariant="titleLarge"
      left={
        <IconButton
          icon="arrow_back"
          accessibilityLabel="Back"
          onPress={() => leaveScreen(router)}
        />
      }
      bottomInset
    >
      <EmptyState icon="settings" title="No settings yet" message="Settings will show up here." />
      <AppText variant="caption" tone="secondary" style={styles.version}>
        Basket Routine {appConfig.expo.version}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  version: {
    textAlign: 'center',
  },
});
