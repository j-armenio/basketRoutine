import { AppText } from '@/components/AppText';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme/colors';
import { radius, spacing, touch } from '@/theme/spacing';
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
      <AppText tone={text === '' ? 'muted' : 'default'} numberOfLines={2} ellipsizeMode="tail">
        {text === '' ? 'Add a note' : text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.surfaceElevated,
  },
});
