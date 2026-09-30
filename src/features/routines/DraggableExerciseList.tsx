import { elevation, spacing } from '@/theme/spacing';
import { useRef, useState } from 'react';
import { LayoutAnimation, StyleSheet, View } from 'react-native';
import { getDraft, updateDraft } from './draftStore';
import { TemplateExerciseCard } from './TemplateExerciseCard';
import { moveExercise, type DraftExercise } from './templateDraft';

type DraggableExerciseListProps = {
  exercises: DraftExercise[];
};

/**
 * The template editor's exercise cards, in order: holding a card's header and dragging it up or
 * down swaps it past a neighbor once the drag crosses half that neighbor's height (`LayoutAnimation`
 * slides the rest into place). The dragged card itself follows the finger exactly, with no
 * animation of its own: every swap adjusts `consumed` by the same amount the card's now-reordered
 * flow position just jumped, so the two cancel out.
 */
export function DraggableExerciseList({ exercises }: DraggableExerciseListProps) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const heights = useRef(new Map<string, number>()).current;
  const dragIndex = useRef(0);
  const consumed = useRef(0);

  const beginDrag = (key: string, index: number) => {
    dragIndex.current = index;
    consumed.current = 0;
    setDragKey(key);
    setDragOffset(0);
  };

  const updateDrag = (key: string, translationY: number) => {
    let pending = translationY - consumed.current;
    for (;;) {
      const order = getDraft()?.exercises ?? [];
      const neighborIndex = dragIndex.current + (pending > 0 ? 1 : -1);
      if (neighborIndex < 0 || neighborIndex >= order.length) break;
      const neighborHeight = heights.get(order[neighborIndex].key) ?? 0;
      const swapDistance = neighborHeight + spacing.sectionGap;
      if (Math.abs(pending) < swapDistance / 2) break;
      LayoutAnimation.easeInEaseOut();
      updateDraft((draft) => moveExercise(draft, key, pending > 0 ? 1 : -1));
      consumed.current += pending > 0 ? swapDistance : -swapDistance;
      dragIndex.current = neighborIndex;
      pending = translationY - consumed.current;
    }
    setDragOffset(pending);
  };

  const endDrag = () => {
    setDragKey(null);
    setDragOffset(0);
  };

  return (
    <View>
      {exercises.map((exercise, index) => (
        <View
          key={exercise.key}
          onLayout={(event) => heights.set(exercise.key, event.nativeEvent.layout.height)}
          style={[
            index > 0 && styles.gap,
            exercise.key === dragKey && [
              styles.dragging,
              { transform: [{ translateY: dragOffset }] },
            ],
          ]}
        >
          <TemplateExerciseCard
            exercise={exercise}
            index={index}
            count={exercises.length}
            onDragStart={() => beginDrag(exercise.key, index)}
            onDragMove={(translationY) => updateDrag(exercise.key, translationY)}
            onDragEnd={endDrag}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    marginTop: spacing.sectionGap,
  },
  dragging: {
    zIndex: 1,
    boxShadow: elevation.fab,
  },
});
