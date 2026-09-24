import { getSessionVersion, notifySessionChanged, subscribe } from './sessionStore';

test('notifies subscribers and bumps the version', () => {
  const listener = jest.fn();
  const unsubscribe = subscribe(listener);
  const before = getSessionVersion();

  notifySessionChanged();

  expect(listener).toHaveBeenCalledTimes(1);
  expect(getSessionVersion()).toBe(before + 1);
  unsubscribe();
});

test('an unsubscribed listener is not called', () => {
  const listener = jest.fn();
  subscribe(listener)();

  notifySessionChanged();

  expect(listener).not.toHaveBeenCalled();
});
