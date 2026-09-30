import { AppText } from '@/components/AppText';
import { BottomActionBar } from '@/components/BottomActionBar';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { pickedMedia } from '@/domain/media';
import { reasonMessage } from '@/domain/messages';
import type { MediaChange } from '@/features/exercises/actions';
import { saveProfile } from '@/features/profile/actions';
import { Avatar } from '@/features/profile/Avatar';
import { useProfile } from '@/features/profile/hooks';
import type { Profile } from '@/features/profile/profileStorage';
import { leaveScreen } from '@/features/workout/navigation';
import { size, spacing } from '@/theme/spacing';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

const NOT_A_PHOTO = "This file type isn't supported. Choose an image.";

/** The profile form: the name and the photo, saved together. */
export default function EditProfileScreen() {
  // The form keeps the values it opened with: later changes to the profile don't reset it.
  return <ProfileForm profile={useProfile()} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState<MediaChange>({ type: 'keep' });
  const [error, setError] = useState<string | null>(null);

  const shownPhoto =
    photo.type === 'replace' ? photo.media.uri : photo.type === 'remove' ? null : profile.photoUri;

  const choosePhoto = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;
    const picked = pickedMedia(asset);
    if (picked.ok && picked.media.kind !== 'video') {
      setPhoto({ type: 'replace', media: picked.media });
      setError(null);
    } else {
      setError(NOT_A_PHOTO);
    }
  };

  const save = () => {
    const result = saveProfile(name, photo);
    if (result.ok) leaveScreen(router);
    else setError(reasonMessage(result.reason));
  };

  return (
    <Screen
      title="Edit Profile"
      titleVariant="title"
      left={
        <IconButton icon="close" accessibilityLabel="Cancel" onPress={() => leaveScreen(router)} />
      }
      footer={<BottomActionBar label="Save Profile" onPress={save} />}
      bottomInset
      keyboardAvoiding
    >
      <Field label="Photo">
        <View style={styles.photo}>
          <Avatar name={name} photoUri={shownPhoto} size={size.avatarLarge} />
        </View>
        <View style={styles.photoButtons}>
          <Button
            variant="outline"
            icon="photo_library"
            label={shownPhoto ? 'Change photo' : 'Choose photo'}
            onPress={choosePhoto}
          />
          {shownPhoto && (
            <Button
              variant="danger"
              label="Remove photo"
              onPress={() => {
                setPhoto({ type: 'remove' });
                setError(null);
              }}
            />
          )}
        </View>
      </Field>
      <Field label="Name">
        <TextField
          accessibilityLabel="Name"
          placeholder="Your name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError(null);
          }}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </Field>
      {error && (
        <AppText tone="error" accessibilityRole="alert">
          {error}
        </AppText>
      )}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="subtitle" weight="bold" tone="secondary">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  photo: {
    alignItems: 'center',
  },
  photoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
