import { act, renderHook } from '@testing-library/react-native';
import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { useNumberCell } from './useNumberCell';

const perform = jest.mocked(performAndroidHapticsAsync);

beforeEach(() => perform.mockClear());

type Set = { targetValue: number | null; loggedValue: number | null };

/** A cell over an in-memory set; `refuse` makes every write fail the way a refused action does. */
async function setup(
  initial: Set,
  field: 'targetValue' | 'loggedValue',
  targetMode: 'attempts' | 'makes' = 'attempts',
  refuse = false,
) {
  let set = initial;
  let mounted = true;
  const onRejected = jest.fn();
  const save = jest.fn((value: number | null) => {
    if (refuse) return { ok: false as const, reason: 'session_not_in_progress' as const };
    set = { ...set, [field]: value };
    rerender();
    return { ok: true as const };
  });
  const hook = await renderHook(() =>
    useNumberCell({ exercise: { targetMode }, set, field, save, onEdit: () => {}, onRejected }),
  );
  const rerender = () => {
    if (mounted) void hook.rerender({});
  };
  const unmount = async () => {
    mounted = false;
    await hook.unmount();
  };
  return { unmount, save, onRejected, cell: () => hook.result.current, stored: () => set };
}

test('a rollback on blur plays the reject haptic once', async () => {
  const { cell, stored } = await setup({ targetValue: 10, loggedValue: 7 }, 'loggedValue');

  await act(() => cell().onFocus());
  await act(() => cell().onChangeText('1'));
  await act(() => cell().onChangeText('11'));
  await act(() => cell().onBlur());

  expect(stored().loggedValue).toBe(7);
  expect(perform.mock.calls).toEqual([[AndroidHaptics.Reject]]);
});

test('the rollback plays it even when nothing had been saved', async () => {
  // "3" against a target of 5 makes is invalid from the first keystroke: nothing is saved
  const { cell, save, onRejected } = await setup(
    { targetValue: 5, loggedValue: 8 },
    'loggedValue',
    'makes',
  );

  await act(() => cell().onFocus());
  await act(() => cell().onChangeText('3'));
  await act(() => cell().onBlur());

  expect(save).not.toHaveBeenCalled();
  expect(onRejected).toHaveBeenCalledWith('makes_exceed_attempts');
  expect(perform.mock.calls).toEqual([[AndroidHaptics.Reject]]);
});

test('a valid blur and the keystrokes play nothing', async () => {
  const { cell, stored } = await setup({ targetValue: 10, loggedValue: 7 }, 'loggedValue');

  await act(() => cell().onFocus());
  await act(() => cell().onChangeText('1'));
  await act(() => cell().onChangeText('11'));
  await act(() => cell().onChangeText('9'));
  await act(() => cell().onBlur());

  expect(stored().loggedValue).toBe(9);
  expect(perform).not.toHaveBeenCalled();
});

test('a write refused on a keystroke is reported but silent', async () => {
  const { cell, onRejected } = await setup(
    { targetValue: 10, loggedValue: 7 },
    'loggedValue',
    'attempts',
    true,
  );

  await act(() => cell().onFocus());
  await act(() => cell().onChangeText('8'));

  expect(onRejected).toHaveBeenCalledWith('session_not_in_progress');
  expect(perform).not.toHaveBeenCalled();
});

test('the rollback on unmount is silent', async () => {
  const { unmount, cell, stored } = await setup({ targetValue: 10, loggedValue: 7 }, 'loggedValue');

  await act(() => cell().onFocus());
  await act(() => cell().onChangeText('1'));
  await act(() => cell().onChangeText('11'));
  await unmount();

  expect(stored().loggedValue).toBe(7);
  expect(perform).not.toHaveBeenCalled();
});
