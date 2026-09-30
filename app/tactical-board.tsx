import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { reasonMessage } from '@/domain/messages';
import { describeBoard } from '@/domain/tacticalBoard';
import { updateDraft } from '@/features/routines/draftStore';
import { setBoard as setDraftBoard } from '@/features/routines/templateDraft';
import {
  begin,
  canSave,
  canUndo,
  cancel,
  clear,
  editingElement,
  end,
  handlePoint,
  hasChanges,
  initialEditorState,
  move,
  previewElement,
  setTool,
  toBoard,
  undo,
} from '@/features/tacticalBoard/boardEditor';
import { BoardToolbar } from '@/features/tacticalBoard/BoardToolbar';
import { CourtBoard } from '@/features/tacticalBoard/CourtBoard';
import { COURT_ASPECT, courtHeight, pointFromView } from '@/features/tacticalBoard/courtGeometry';
import { loadBoardSource } from '@/features/tacticalBoard/loadBoard';
import { setBoard as setSessionBoard } from '@/features/workout/actions';
import { leaveScreen } from '@/features/workout/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, State } from 'react-native-gesture-handler';

const parseId = (value: string | undefined) => (value === undefined ? undefined : Number(value));

/**
 * The tactical board editor, full screen: a FIBA half court to draw on, the tools at the bottom.
 * `?sessionExerciseId=` edits an exercise of the workout in progress (Save writes it at once);
 * `?draftKey=` one of the template being edited (Save puts it in the draft, written by the
 * template's own Save). The board stays in memory until Save; leaving with changes asks first.
 */
export default function TacticalBoardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ sessionExerciseId?: string; draftKey?: string }>();
  // Read once: what is drawn here stays local until Save.
  const [source] = useState(() =>
    loadBoardSource({
      sessionExerciseId: parseId(params.sessionExerciseId),
      draftKey: params.draftKey,
    }),
  );
  const [editor, setEditor] = useState(() => initialEditorState(source?.board ?? null));
  const dirty = source !== null && hasChanges(source.board, editor);
  // Set before the editor's own navigation (after Save or Discard): `dirty` comes from the last
  // render, so the guard would still block it.
  const leaving = useRef(false);

  const window = useWindowDimensions();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  // The court as wide as the screen allows, and never taller than the room above the tools.
  const width = area
    ? Math.min(area.width, area.height * COURT_ASPECT)
    : window.width - 2 * spacing.sm;

  const pan = useMemo(() => {
    const at = (event: { x: number; y: number }) => pointFromView(event.x, event.y, width);
    // One finger, from the first touch: a tap places an X, a drag draws.
    return Gesture.Pan()
      .withTestId('board-canvas')
      .minDistance(0)
      .maxPointers(1)
      .runOnJS(true)
      .onBegin((event) => setEditor((state) => begin(state, at(event))))
      .onUpdate((event) => setEditor((state) => move(state, at(event))))
      .onFinalize((event) =>
        setEditor((state) =>
          event.state === State.CANCELLED ? cancel(state) : end(state, at(event)),
        ),
      );
  }, [width]);

  usePreventRemove(dirty, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert('Discard changes?', 'Your changes to this board will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          leaving.current = true;
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const cancelButton = <Button variant="text" label="Cancel" onPress={() => leaveScreen(router)} />;

  if (!source) {
    return (
      <Screen title="Tactical board" titleVariant="title" left={cancelButton} bottomInset>
        <EmptyState
          icon="sports_basketball"
          title="Board not found"
          message="This exercise isn't open anymore."
          action={{ label: 'Go back', onPress: () => leaveScreen(router) }}
        />
      </Screen>
    );
  }

  const board = toBoard(editor);

  const save = () => {
    if (source.kind === 'session') {
      const result = setSessionBoard(source.sessionExerciseId, board);
      if (!result.ok) {
        Alert.alert("Couldn't save board", reasonMessage(result.reason));
        return;
      }
    } else {
      updateDraft((draft) => setDraftBoard(draft, source.draftKey, board));
    }
    leaving.current = true;
    leaveScreen(router);
  };

  const confirmClear = () =>
    Alert.alert('Clear the board?', 'Every mark on it will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setEditor(clear) },
    ]);

  return (
    <Screen
      title="Tactical board"
      subtitle={source.exerciseName}
      titleVariant="title"
      left={cancelButton}
      centerHeader
      right={
        <Button variant="primaryCompact" label="Save" disabled={!canSave(editor)} onPress={save} />
      }
      scroll={false}
      footer={
        <BoardToolbar
          tool={editor.tool}
          onTool={(tool) => setEditor((state) => setTool(state, tool))}
          canUndo={canUndo(editor)}
          hasMarks={editor.elements.length > 0}
          onUndo={() => setEditor(undo)}
          onClear={confirmClear}
        />
      }
    >
      <View
        style={styles.area}
        onLayout={(event) => {
          const { width: w, height: h } = event.nativeEvent.layout;
          setArea({ width: w, height: h });
        }}
      >
        <GestureDetector gesture={pan}>
          <View
            testID="board-canvas"
            accessible
            accessibilityRole="image"
            accessibilityLabel={describeBoard(board)}
            style={[styles.canvas, { width, height: courtHeight(width) }]}
          >
            <CourtBoard
              board={board}
              width={width}
              preview={previewElement(editor)}
              editing={editingElement(editor)}
              handle={handlePoint(editor)}
            />
          </View>
        </GestureDetector>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Wider than the screen's padding: the court takes the whole width but a thin margin. Centered
  // vertically: on a tall screen, the room above the tools is taller than the court needs.
  area: {
    flex: 1,
    marginHorizontal: -spacing.sm,
    paddingBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    borderRadius: radius.court,
    overflow: 'hidden',
    backgroundColor: colors.court,
  },
});
