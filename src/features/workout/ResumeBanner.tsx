import { AppText } from '@/components/AppText';
import { colors } from '@/theme/colors';
import { spacing, touch } from '@/theme/spacing';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { discardWorkout } from './actions';
import { useInProgressSession } from './hooks';

/** "Workout in progress", above the tab bar on every tab. Renders nothing without a session. */
export function ResumeBanner() {
  const router = useRouter();
  const session = useInProgressSession();
  if (!session) return null;

  const confirmDiscard = () =>
    Alert.alert('Discard workout?', 'Everything logged in this workout will be deleted.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => discardWorkout(session.id) },
    ]);

  return (
    <View style={styles.banner}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Resume ${session.name}`}
        onPress={() => router.push('/active-workout')}
        style={({ pressed }) => [styles.resume, pressed && styles.pressed]}
      >
        <AppText variant="caption" tone="accent">
          Workout in progress
        </AppText>
        <AppText variant="label" numberOfLines={1}>
          {session.name}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Discard workout"
        onPress={confirmDiscard}
        style={({ pressed }) => [styles.discard, pressed && styles.pressed]}
      >
        <AppText variant="label" tone="danger">
          Discard
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resume: {
    flex: 1,
    minHeight: touch.primary,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  discard: {
    minHeight: touch.primary,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
});
