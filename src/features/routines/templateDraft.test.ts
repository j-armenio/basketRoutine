import {
  addExercise,
  addSet,
  deleteSet,
  draftFromWorkout,
  emptyDraft,
  isDirty,
  moveExercise,
  removeExercise,
  rename,
  setTarget,
  toSaveInput,
  type TemplateDraft,
} from './templateDraft';

const freeThrows = { id: 1, name: 'Free Throws', trackingType: 'makes_attempts' as const };
const figure8 = { id: 2, name: 'Figure 8', trackingType: 'check' as const };

function sample(): TemplateDraft {
  let draft = rename(emptyDraft(7), 'Shooting day');
  draft = addExercise(draft, freeThrows, 'attempts');
  return addExercise(draft, figure8, null);
}

describe('addExercise', () => {
  test('appends with one set at the default target of its mode', () => {
    let draft = addExercise(emptyDraft(1), freeThrows, 'attempts');
    draft = addExercise(draft, { ...freeThrows, id: 3, name: 'Mikan' }, 'makes');
    draft = addExercise(draft, figure8, null);

    expect(
      draft.exercises.map((e) => [e.name, e.targetMode, e.sets.map((s) => s.targetValue)]),
    ).toEqual([
      ['Free Throws', 'attempts', [10]],
      ['Mikan', 'makes', [5]],
      ['Figure 8', null, [null]],
    ]);
  });

  test('gives every exercise and set its own key', () => {
    const draft = addSet(sample(), sample().exercises[0].key);
    const keys = draft.exercises.flatMap((e) => [e.key, ...e.sets.map((s) => s.key)]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('removeExercise and moveExercise', () => {
  test('remove drops the exercise by key', () => {
    const draft = sample();
    expect(removeExercise(draft, draft.exercises[0].key).exercises.map((e) => e.name)).toEqual([
      'Figure 8',
    ]);
  });

  test('move swaps with the neighbor, and stays put at the ends', () => {
    const draft = sample();
    const [first, second] = draft.exercises;
    expect(moveExercise(draft, second.key, -1).exercises.map((e) => e.key)).toEqual([
      second.key,
      first.key,
    ]);
    expect(moveExercise(draft, first.key, -1).exercises.map((e) => e.key)).toEqual([
      first.key,
      second.key,
    ]);
    expect(moveExercise(draft, second.key, 1).exercises.map((e) => e.key)).toEqual([
      first.key,
      second.key,
    ]);
  });
});

describe('sets', () => {
  test('addSet copies the last target', () => {
    let draft = sample();
    const shooting = draft.exercises[0];
    draft = setTarget(draft, shooting.key, shooting.sets[0].key, 20);
    draft = addSet(draft, shooting.key);
    draft = addSet(draft, draft.exercises[1].key);

    expect(draft.exercises[0].sets.map((s) => s.targetValue)).toEqual([20, 20]);
    expect(draft.exercises[1].sets.map((s) => s.targetValue)).toEqual([null, null]);
  });

  test('setTarget changes one set only', () => {
    let draft = addSet(sample(), sample().exercises[0].key);
    draft = addSet(draft, draft.exercises[0].key);
    const shooting = draft.exercises[0];
    draft = setTarget(draft, shooting.key, shooting.sets[1].key, 3);
    expect(draft.exercises[0].sets.map((s) => s.targetValue)).toEqual([10, 3]);
  });

  test('deleteSet removes a set but refuses the last one', () => {
    let draft = sample();
    const key = draft.exercises[0].key;
    draft = addSet(draft, key);
    const [first, second] = draft.exercises[0].sets;

    draft = deleteSet(draft, key, first.key);
    expect(draft.exercises[0].sets.map((s) => s.key)).toEqual([second.key]);

    expect(deleteSet(draft, key, second.key)).toEqual(draft);
  });
});

describe('draftFromWorkout and toSaveInput', () => {
  const workout = {
    id: 5,
    routineId: 2,
    name: 'Day',
    exercises: [
      {
        exerciseId: 1,
        targetMode: 'attempts' as const,
        exercise: { name: 'Free Throws', trackingType: 'makes_attempts' as const },
        sets: [{ targetValue: 10 }, { targetValue: 12 }],
      },
      {
        exerciseId: 2,
        targetMode: null,
        exercise: { name: 'Figure 8', trackingType: 'check' as const },
        sets: [{ targetValue: null }],
      },
    ],
  };

  test('load a workout and save it back unchanged', () => {
    const draft = draftFromWorkout(workout);
    expect(draft).toMatchObject({ workoutId: 5, routineId: 2, name: 'Day' });
    expect(toSaveInput(draft)).toEqual({
      workoutId: 5,
      routineId: 2,
      name: 'Day',
      exercises: [
        { exerciseId: 1, targetMode: 'attempts', targetValues: [10, 12] },
        { exerciseId: 2, targetMode: null, targetValues: [null] },
      ],
    });
  });

  test('a new draft has no workout id', () => {
    expect(toSaveInput(emptyDraft(3))).toEqual({
      workoutId: undefined,
      routineId: 3,
      name: '',
      exercises: [],
    });
  });
});

describe('isDirty', () => {
  const initial = () =>
    draftFromWorkout({
      id: 1,
      routineId: 1,
      name: 'Push',
      exercises: [
        {
          exerciseId: 1,
          targetMode: 'attempts',
          exercise: { name: 'Free Throws', trackingType: 'makes_attempts' },
          sets: [{ targetValue: 10 }],
        },
      ],
    });

  test('a draft is not dirty as loaded, even though its keys are new', () => {
    expect(isDirty(initial(), initial())).toBe(false);
  });

  test('a name that only differs in spaces is not a change', () => {
    expect(isDirty(initial(), rename(initial(), ' Push '))).toBe(false);
    expect(isDirty(initial(), rename(initial(), 'Pull'))).toBe(true);
  });

  test('a changed target, a new set, an exercise added, removed or moved is a change', () => {
    const base = initial();
    const key = base.exercises[0].key;
    expect(isDirty(base, setTarget(base, key, base.exercises[0].sets[0].key, 11))).toBe(true);
    expect(isDirty(base, addSet(base, key))).toBe(true);
    expect(isDirty(base, addExercise(base, figure8, null))).toBe(true);
    expect(isDirty(base, removeExercise(base, key))).toBe(true);
    const two = addExercise(base, figure8, null);
    expect(isDirty(two, moveExercise(two, key, 1))).toBe(true);
  });

  test('typing a target back to its old value is not a change', () => {
    const base = initial();
    const { key, sets } = base.exercises[0];
    const changed = setTarget(base, key, sets[0].key, 11);
    expect(isDirty(base, setTarget(changed, key, sets[0].key, 10))).toBe(false);
  });

  test('a new draft is dirty once it has a name or an exercise', () => {
    const empty = emptyDraft(1);
    expect(isDirty(empty, empty)).toBe(false);
    expect(isDirty(empty, rename(empty, 'X'))).toBe(true);
    expect(isDirty(empty, addExercise(empty, figure8, null))).toBe(true);
  });
});
