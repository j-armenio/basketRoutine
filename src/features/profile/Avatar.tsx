import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme/colors';
import { size as sizes } from '@/theme/spacing';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { initialOf } from './profileText';

type AvatarProps = {
  name: string;
  photoUri: string | null;
  /** `size.avatar` on the Profile card, `size.avatarLarge` on Edit Profile. */
  size: number;
};

/**
 * The profile photo in a circle, or, without one, the name's initial on green (a person icon
 * with no name either). Hidden from accessibility: what presses it names it.
 */
export function Avatar({ name, photoUri, size }: AvatarProps) {
  const initial = initialOf(name);
  const circle = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View
      testID="avatar"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, circle]}
    >
      {photoUri ? (
        <Image
          testID="avatar-photo"
          source={{ uri: photoUri }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : initial ? (
        <AppText variant="display" style={{ color: colors.onSecondary }}>
          {initial}
        </AppText>
      ) : (
        <Icon name="person" size={sizes.placeholderIcon} color={colors.onSecondary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
});
