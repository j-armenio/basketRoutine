import { DomainError } from '@/domain/errors';
import { getDataVersion, notifyDataChanged, run, subscribe } from './dataStore';

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
