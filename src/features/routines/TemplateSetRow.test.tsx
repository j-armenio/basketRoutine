import { colors } from '@/theme/colors';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { closeDraft, getDraft, openDraft, useDraft } from './draftStore';
import { TemplateSetRow } from './TemplateSetRow';
import { addExercise, addSet, emptyDraft, type TemplateDraft } from './templateDraft';

const freeThrows = { id: 1, name: 'Free Throws', trackingType: 'makes_attempts' as const };
const figure8 = { id: 2, name: 'Figure 8', trackingType: 'check' as const };

// Renders the first set of the first exercise from the open draft, like the editor does.
function Harness({ set = 0 }: { set?: number }) {
  const draft = useDraft();
  const exercise = draft?.exercises[0];
  if (!exercise) return null;
  return (
    <TemplateSetRow
      exerciseKey={exercise.key}
      set={exercise.sets[set]}
      number={set + 1}
      targetMode={exercise.targetMode}
      deletable={exercise.sets.length > 1}
    />
  );
}

const target = () => getDraft()!.exercises[0].sets[0].targetValue;

async function setup(build: (draft: TemplateDraft) => TemplateDraft) {
  openDraft(build(emptyDraft(1)));
  return render(<Harness />);
}
const shooting = (draft: TemplateDraft) => addExercise(draft, freeThrows, 'attempts');

afterEach(async () => {
  await cleanup();
  closeDraft();
});

test('a valid target updates the draft on the keystroke', async () => {
  await setup(shooting);
  const input = screen.getByLabelText('Set 1 attempts');
  expect(input).toHaveDisplayValue('10');

  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, '20');

  expect(target()).toBe(20);
  expect(input).toHaveDisplayValue('20');
});

test('an invalid target rolls back on blur, with the reason', async () => {
  await setup(shooting);
  const input = screen.getByLabelText('Set 1 attempts');

  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, '5');
  await fireEvent.changeText(input, '');
  await fireEvent.changeText(input, '0');
  expect(screen.queryByText('The target must be a whole number of at least 1.')).toBeNull();
  await fireEvent(input, 'blur');

  expect(target()).toBe(10);
  expect(input).toHaveDisplayValue('10');
  expect(input).toHaveStyle({ borderColor: colors.danger });
  expect(screen.getByText('The target must be a whole number of at least 1.')).toBeOnTheScreen();
});

test('unmounting with an invalid target after the draft was closed throws nothing', async () => {
  const view = await setup(shooting);
  const input = screen.getByLabelText('Set 1 attempts');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, '5');
  await fireEvent.changeText(input, '0');

  await act(async () => closeDraft());
  await view.unmount();

  expect(getDraft()).toBeNull();
});

test('unmounting with an invalid target rolls the draft back', async () => {
  const view = await setup(shooting);
  const input = screen.getByLabelText('Set 1 attempts');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, '5');
  await fireEvent.changeText(input, '0');
  expect(target()).toBe(5);

  await view.unmount();

  expect(target()).toBe(10);
});

test('the delete accessibility action removes the set, except the last one', async () => {
  await setup((draft) => {
    const withExercise = shooting(draft);
    return addSet(withExercise, withExercise.exercises[0].key);
  });
  expect(getDraft()!.exercises[0].sets).toHaveLength(2);

  await fireEvent(screen.getByTestId('set-1'), 'accessibilityAction', {
    nativeEvent: { actionName: 'delete' },
  });

  expect(getDraft()!.exercises[0].sets).toHaveLength(1);
  expect(screen.getByTestId('set-1')).toHaveProp('accessibilityActions', []);
  await fireEvent(screen.getByTestId('set-1'), 'accessibilityAction', {
    nativeEvent: { actionName: 'delete' },
  });
  expect(getDraft()!.exercises[0].sets).toHaveLength(1);
});

test('a check drill shows only the set number', async () => {
  await setup((draft) => addExercise(draft, figure8, null));

  expect(screen.getByText('1')).toBeOnTheScreen();
  expect(screen.queryByLabelText(/Set 1/)).toBeNull();
});
