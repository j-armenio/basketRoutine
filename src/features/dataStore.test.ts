import { DomainError } from '@/domain/errors';
import { act, renderHook } from '@testing-library/react-native';
import {
  getDataVersion,
  notifyDataChanged,
  run,
  subscribe,
  useDataVersionWhile,
} from './dataStore';

test('notifies subscribers and bumps the version', () => {
  const listener = jest.fn();
  const unsubscribe = subscribe(listener);
  const before = getDataVersion();

  notifyDataChanged();

  expect(listener).toHaveBeenCalledTimes(1);
  expect(getDataVersion()).toBe(before + 1);
  unsubscribe();
});

test('an unsubscribed listener is not called', () => {
  const listener = jest.fn();
  subscribe(listener)();

  notifyDataChanged();

  expect(listener).not.toHaveBeenCalled();
});

describe('run', () => {
  test('returns the value and notifies once', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    expect(run(() => 42)).toEqual({ ok: true, value: 42 });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test('turns a DomainError into its reason and does not notify', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    expect(
      run(() => {
        throw new DomainError('empty_name');
      }),
    ).toEqual({ ok: false, reason: 'empty_name' });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  test('rethrows any other error', () => {
    const bug = new Error('boom');
    expect(() =>
      run(() => {
        throw bug;
      }),
    ).toThrow(bug);
  });
});

describe('useDataVersionWhile', () => {
  async function render(initialActive: boolean) {
    const renders = jest.fn();
    const hook = await renderHook<number, { active: boolean }>(
      ({ active }) => {
        renders();
        return useDataVersionWhile(active);
      },
      { initialProps: { active: initialActive } },
    );
    return { ...hook, renders };
  }

  test('follows every bump while active', async () => {
    const { result } = await render(true);
    const start = getDataVersion();
    expect(result.current).toBe(start);

    await act(async () => notifyDataChanged());
    await act(async () => notifyDataChanged());

    expect(result.current).toBe(start + 2);
  });

  test('while inactive, a bump neither changes the value nor re-renders', async () => {
    const { result, rerender, renders } = await render(true);
    const seen = result.current;
    await rerender({ active: false });
    const rendersBefore = renders.mock.calls.length;

    await act(async () => notifyDataChanged());
    await act(async () => notifyDataChanged());

    expect(result.current).toBe(seen);
    expect(renders.mock.calls.length).toBe(rendersBefore);
  });

  test('becoming active catches up to the current version', async () => {
    const { result, rerender } = await render(true);
    const seen = result.current;
    await rerender({ active: false });
    await act(async () => notifyDataChanged());
    expect(result.current).toBe(seen);

    await rerender({ active: true });
    expect(result.current).toBe(getDataVersion());

    await act(async () => notifyDataChanged());
    expect(result.current).toBe(getDataVersion());
  });

  test('starting inactive holds the version it mounted with', async () => {
    const { result } = await render(false);
    const seen = result.current;
    await act(async () => notifyDataChanged());
    expect(result.current).toBe(seen);
  });
});
