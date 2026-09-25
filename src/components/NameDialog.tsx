import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { TextField } from './TextField';

type NameDialogProps = {
  visible: boolean;
  title: string;
  /** What the field starts with each time the dialog opens ('' for a new item). */
  initialName?: string;
  confirmLabel?: string;
  /** Called with the trimmed name; the owner closes the dialog. */
  onConfirm: (name: string) => void;
  /** The backdrop, Cancel and the Android back button. */
  onClose: () => void;
};

/**
 * Asks for a name in a small dialog, since Android has no `Alert.prompt`. Save is disabled while
 * the name is blank. The content is rendered only while visible, so the field starts fresh
 * each time.
 */
export function NameDialog({
  visible,
  title,
  initialName = '',
  confirmLabel = 'Save',
  onConfirm,
  onClose,
}: NameDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <DialogBody
        title={title}
        initialName={initialName}
        confirmLabel={confirmLabel}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Modal>
  );
}

function DialogBody({
  title,
  initialName,
  confirmLabel,
  onConfirm,
  onClose,
}: Required<Omit<NameDialogProps, 'visible'>>) {
  const [name, setName] = useState(initialName);
  const canSave = name.trim() !== '';
  const confirm = () => {
    if (canSave) onConfirm(name.trim());
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close dialog"
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        onPress={onClose}
      />
      <View style={styles.dialog}>
        <AppText variant="heading">{title}</AppText>
        <TextField
          accessibilityLabel="Name"
          value={name}
          onChangeText={setName}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={confirm}
        />
        <View style={styles.actions}>
          <Button variant="ghost" label="Cancel" onPress={onClose} />
          <Button label={confirmLabel} disabled={!canSave} onPress={confirm} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dialog: {
    padding: spacing.lg,
    gap: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
