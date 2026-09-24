import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { startEmptyWorkout } from '@/features/workout/actions';
import { useInProgressSession } from '@/features/workout/hooks';
import { useRouter } from 'expo-router';

export default function WorkoutScreen() {
  const router = useRouter();
  const session = useInProgressSession();

  const startOrResume = () => {
    if (session || startEmptyWorkout().ok) router.push('/active-workout');
  };

  return (
    <Screen title="Workout">
      <Card>
        <AppText variant="heading">Quick Start</AppText>
        <Button
          label={session ? 'Resume Workout' : 'Start Empty Workout'}
          icon={session ? 'play_arrow' : 'add'}
          fullWidth
          onPress={startOrResume}
        />
      </Card>
      <AppText variant="heading">Routines</AppText>
      <EmptyState
        icon="sports_basketball"
        title="No routines yet"
        message="Create a routine to plan your training."
      />
    </Screen>
  );
}
