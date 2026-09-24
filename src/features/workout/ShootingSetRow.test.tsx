import { exercises } from '@/db/schema';
import { getInProgressSession, getSessionDetail } from '@/db/repositories/sessions';
import type { Db } from '@/db/types';
import type { TargetMode } from '@/domain/types';
import { colors } from '@/theme/colors';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { addExercise, discardWorkout, startEmptyWorkout, updateSet } from './actions';
import { useSessionDetail } from './hooks';
import { ShootingSetRow } from './ShootingSetRow';

jest.mock('@/db/client', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { createTestDb } = require('@/db/test-utils');
  const { seedExercises } = require('@/db/seed/seed');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const db = createTestDb();
  seedExercises(db);
  return { db };
});

const { db } = jest.requireMock('@/db/client') as { db: Db };

// Renders the row from the live DB, the way the active workout does.
function Harness({ sessionId }: { sessionId: number }) {
  const exercise = useSessionDetail(sessionId)!.exercises[0];
  return (
    <ShootingSetRow
      set={exercise.sets[0]}
      number={1}
      targetMode={exercise.targetMode!}
      deletable={false}
    />
  );
}

async function setup(mode: TargetMode, logged?: number) {
  const seedKey = mode === 'attempts' ? 'free_throws' : 'mikan_drill';
  const id = db.select().from(exercises).where(eq(exercises.seedKey, seedKey)).get()!.id;
  const started = startEmptyWorkout();
  if (!started.ok) throw new Error(started.reason);
  const session = started.value;
  addExercise(session.id, id, mode);
  if (logged !== undefined) {
    updateSet(getSessionDetail(db, session.id)!.exercises[0].sets[0].id, {
      loggedValue: logged,
    });
  }
  const view = await render(<Harness sessionId={session.id} />);
  const stored = () => getSessionDetail(db, session.id)!.exercises[0].sets[0];
  return { stored, view };
}

afterEach(async () => {
  // unmount first: the harness can't render a discarded session
  await cleanup();
  const session = getInProgressSession(db);
  if (session) discardWorkout(session.id);
});

test('a valid value is saved on the keystroke and the FG% follows it', async () => {
  const { stored } = await setup('attempts');
  const makes = screen.getByLabelText('Set 1 makes');
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('—');

  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '7');

  expect(stored().loggedValue).toBe(7);
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('70%');
  expect(makes).toHaveDisplayValue('7');
});

test('the target cell is the compact one, and editing it recalculates the FG%', async () => {
  const { stored } = await setup('attempts', 5);
  const attempts = screen.getByLabelText('Set 1 attempts');
  expect(attempts).toHaveDisplayValue('10');
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('50%');

  await fireEvent(attempts, 'focus');
  await fireEvent.changeText(attempts, '20');

  expect(stored().targetValue).toBe(20);
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('25%');
});

test('an invalid value is not saved and not marked while typing', async () => {
  const { stored } = await setup('attempts', 7);
  const makes = screen.getByLabelText('Set 1 makes');

  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '1');
  await fireEvent.changeText(makes, '11');

  // the "1" was saved on the way, "11" was not
  expect(stored().loggedValue).toBe(1);
  expect(makes).toHaveDisplayValue('11');
  expect(screen.queryByText("Makes can't exceed attempts.")).toBeNull();
  expect(makes).not.toHaveStyle({ borderColor: colors.danger });
});

test('blur rolls an invalid value back to the one at focus, in the DB too, and explains', async () => {
  const { stored } = await setup('attempts', 7);
  const makes = screen.getByLabelText('Set 1 makes');

  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '1');
  await fireEvent.changeText(makes, '11');
  await fireEvent(makes, 'blur');

  expect(stored().loggedValue).toBe(7);
  expect(makes).toHaveDisplayValue('7');
  expect(makes).toHaveStyle({ borderColor: colors.danger });
  expect(screen.getByText("Makes can't exceed attempts.")).toBeOnTheScreen();
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('70%');

  // the mark goes away with the next edit
  await fireEvent(makes, 'focus');
  expect(screen.queryByText("Makes can't exceed attempts.")).toBeNull();
});

test('a valid value survives blur with no error', async () => {
  const { stored } = await setup('attempts', 7);
  const makes = screen.getByLabelText('Set 1 makes');

  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '9');
  await fireEvent(makes, 'blur');

  expect(stored().loggedValue).toBe(9);
  expect(makes).not.toHaveStyle({ borderColor: colors.danger });
});

test('an empty target is rolled back on blur', async () => {
  const { stored } = await setup('attempts');
  const attempts = screen.getByLabelText('Set 1 attempts');

  await fireEvent(attempts, 'focus');
  await fireEvent.changeText(attempts, '');
  await fireEvent(attempts, 'blur');

  expect(stored().targetValue).toBe(10);
  expect(attempts).toHaveDisplayValue('10');
  expect(screen.getByText('The target must be a whole number of at least 1.')).toBeOnTheScreen();
});

test('clearing the logged value leaves the set empty with no error', async () => {
  const { stored } = await setup('attempts', 7);
  const makes = screen.getByLabelText('Set 1 makes');

  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '');
  await fireEvent(makes, 'blur');

  expect(stored().loggedValue).toBeNull();
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('—');
  expect(makes).not.toHaveStyle({ borderColor: colors.danger });
});

test('in makes mode a two-digit value passes through an invalid prefix with no error', async () => {
  const { stored } = await setup('makes');
  const attempts = screen.getByLabelText('Set 1 attempts');
  expect(screen.getByLabelText('Set 1 makes')).toHaveDisplayValue('5');

  await fireEvent(attempts, 'focus');
  await fireEvent.changeText(attempts, '1');
  expect(screen.queryByText("Makes can't exceed attempts.")).toBeNull();
  await fireEvent.changeText(attempts, '12');
  await fireEvent(attempts, 'blur');

  expect(stored().loggedValue).toBe(12);
  expect(screen.queryByText("Makes can't exceed attempts.")).toBeNull();
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('42%');
});

test('unmounting with an invalid draft rolls it back as well', async () => {
  const { stored, view } = await setup('attempts', 7);
  const makes = screen.getByLabelText('Set 1 makes');

  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '1');
  await fireEvent.changeText(makes, '11');
  expect(stored().loggedValue).toBe(1);

  await view.unmount();

  expect(stored().loggedValue).toBe(7);
});
