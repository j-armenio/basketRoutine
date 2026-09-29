import { AppText } from '@/components/AppText';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme/colors';
import { opacity, radius, size, spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { updateNote } from './actions';

type ExerciseNoteProps = {
  exerciseId: number;
  name: string;
  note: string;
};

/**
 * The exercise note. At rest it shows at most two lines, ending in "…", so a long note doesn't
 * stretch the card. Tapping it opens the field, which grows up to four lines and then scrolls.
 */
export function ExerciseNote({ exerciseId, name, note }: ExerciseNoteProps) {
  const [editing, setEditing] = useState(false);
  // Nothing else edits the note, so the field keeps its own text and writes it through.
  const [text, setText] = useState(note);
  const label = `${name} note`;

  if (editing) {
    return (
      <TextField
        variant="raised"
        accessibilityLabel={label}
        placeholder="Add a note"
        multiline
        maxLines={4}
        autoFocus
        value={text}
        onChangeText={(value) => {
          setText(value);
          updateNote(exerciseId, value);
        }}
        onBlur={() => setEditing(false)}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={text === '' ? undefined : text}
      onPress={() => setEditing(true)}
      style={({ pressed }) => [styles.note, pressed && styles.pressed]}
    >
      <AppText
        variant="bodySmall"
        tone={text === '' ? 'secondary' : 'default'}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {text === '' ? 'Add a note' : text}
      </AppText>
    </Pressable>
  );
}

// At rest it looks like the field it opens into.
const styles = StyleSheet.create({
  note: {
    minHeight: size.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.cell,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
