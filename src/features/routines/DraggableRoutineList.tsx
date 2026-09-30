import type { RoutineWithWorkouts } from '@/db/repositories/routines';
import { moveItem } from '@/domain/order';
import { elevation, spacing } from '@/theme/spacing';
import { useRef, useState } from 'react';
import { LayoutAnimation, StyleSheet, View } from 'react-native';
import { moveRoutine } from './actions';
import { RoutineSection } from './RoutineSection';

type DraggableRoutineListProps = {
  routines: RoutineWithWorkouts[];
  onRename: (routine: RoutineWithWorkouts) => void;
  onNewWorkout: (routine: RoutineWithWorkouts) => void;
  onEditWorkout: (workoutId: number) => void;
  onStartWorkout: (routine: RoutineWithWorkouts, workoutId: number) => void;
};

/**
 * The Workout tab's routines, in order: holding a section's name and dragging it up or down swaps
 * it past a neighbor once the drag crosses half that neighbor's height (`LayoutAnimation` slides
 * the rest into place), same as `DraggableExerciseList`. Unlike the template editor's draft, a
 * routine's order lives in the DB, so every swap writes it at once through `moveRoutine`: a local
 * `order` ref of ids tracks it through the drag instead of a synchronous in-memory store.
 */
export function DraggableRoutineList({
  routines,
  onRename,
  onNewWorkout,
  onEditWorkout,
  onStartWorkout,
}: DraggableRoutineListProps) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const heights = useRef(new Map<number, number>()).current;
  const dragIndex = useRef(0);
  // Tracks the order through an active drag only; the menu's Move up/down reads `routines` fresh.
  const order = useRef<number[]>([]);
  const consumed = useRef(0);

  const routineIds = routines.map((routine) => routine.id);

  const beginDrag = (id: number, index: number) => {
    order.current = routineIds;
    dragIndex.current = index;
    consumed.current = 0;
    setDragId(id);
    setDragOffset(0);
  };

  const updateDrag = (translationY: number) => {
    let pending = translationY - consumed.current;
    for (;;) {
      const neighborIndex = dragIndex.current + (pending > 0 ? 1 : -1);
      if (neighborIndex < 0 || neighborIndex >= order.current.length) break;
      const neighborHeight = heights.get(order.current[neighborIndex]) ?? 0;
      const swapDistance = neighborHeight + spacing.sectionGap;
      if (Math.abs(pending) < swapDistance / 2) break;
      LayoutAnimation.easeInEaseOut();
      order.current = moveItem(order.current, dragIndex.current, pending > 0 ? 1 : -1);
      moveRoutine(order.current);
      consumed.current += pending > 0 ? swapDistance : -swapDistance;
      dragIndex.current = neighborIndex;
      pending = translationY - consumed.current;
    }
    setDragOffset(pending);
  };

  const endDrag = () => {
    setDragId(null);
    setDragOffset(0);
  };

  return (
    <View>
      {routines.map((routine, index) => (
        <View
          key={routine.id}
          onLayout={(event) => heights.set(routine.id, event.nativeEvent.layout.height)}
          style={[
            index > 0 && styles.gap,
            routine.id === dragId && [styles.dragging, { transform: [{ translateY: dragOffset }] }],
          ]}
        >
          <RoutineSection
            routine={routine}
            index={index}
            count={routines.length}
            onRename={() => onRename(routine)}
            onMove={(delta) => moveRoutine(moveItem(routineIds, index, delta))}
            onNewWorkout={() => onNewWorkout(routine)}
            onEditWorkout={onEditWorkout}
            onStartWorkout={(workoutId) => onStartWorkout(routine, workoutId)}
            onDragStart={() => beginDrag(routine.id, index)}
            onDragMove={updateDrag}
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
