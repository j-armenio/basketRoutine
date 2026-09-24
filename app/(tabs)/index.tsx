import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function WorkoutScreen() {
  return (
    <Screen title="Workout">
      <Card>
        <AppText variant="heading">Quick Start</AppText>
        <Button label="Start Empty Workout" icon="add" disabled fullWidth onPress={() => {}} />
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
