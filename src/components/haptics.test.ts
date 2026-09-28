import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { haptics } from './haptics';

const perform = jest.mocked(performAndroidHapticsAsync);

// Lets the Promise chain settle.
const flush = () => new Promise((resolve) => setImmediate(resolve));

afterEach(() => perform.mockReset().mockResolvedValue(undefined));

test('confirm and reject play the Android constants', async () => {
  haptics.confirm();
  haptics.reject();
  await flush();

  expect(perform.mock.calls).toEqual([[AndroidHaptics.Confirm], [AndroidHaptics.Reject]]);
});

test('an Android version without the constant plays the fallback', async () => {
  perform.mockRejectedValueOnce(new Error('not supported'));

  haptics.confirm();
  await flush();

  expect(perform.mock.calls).toEqual([[AndroidHaptics.Confirm], [AndroidHaptics.Context_Click]]);
});

test('a failure is swallowed: nothing throws and nothing is left unhandled', async () => {
  perform.mockRejectedValue(new Error('no vibrator'));

  expect(() => haptics.reject()).not.toThrow();
  await flush();

  expect(perform.mock.calls).toEqual([[AndroidHaptics.Reject], [AndroidHaptics.Long_Press]]);
});
