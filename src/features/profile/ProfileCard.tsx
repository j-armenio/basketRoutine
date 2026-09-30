import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { opacity, size, spacing } from '@/theme/spacing';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from './Avatar';
import type { Profile } from './profileStorage';
import { displayName, workoutsLogged } from './profileText';

type ProfileCardProps = {
  profile: Profile;
  /** Finished workouts. */
  count: number;
  onEdit: () => void;
};

/** The top of the Profile tab: the photo, the name, how many workouts, and Edit Profile. */
export function ProfileCard({ profile, count, onEdit }: ProfileCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.identity}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          onPress={onEdit}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar name={profile.name} photoUri={profile.photoUri} size={size.avatar} />
        </Pressable>
        <View style={styles.texts}>
          <AppText variant="headline" numberOfLines={1}>
            {displayName(profile.name)}
          </AppText>
          <AppText variant="subtitle" tone="secondary">
            {workoutsLogged(count)}
          </AppText>
        </View>
      </View>
      <Button variant="bordered" icon="edit" label="Edit Profile" onPress={onEdit} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
