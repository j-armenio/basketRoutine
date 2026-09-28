import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';

/**
 * Plays Android's own touch feedback (it follows the phone's "touch feedback" setting and needs
 * no vibrate permission). `Confirm` and `Reject` exist from Android 11 (API 30) on; before that
 * the call rejects and a constant every version has plays instead. A failure is swallowed: a
 * phone without a vibrator, or with haptics off, must never break a write.
 */
function play(type: AndroidHaptics, fallback: AndroidHaptics): void {
  performAndroidHapticsAsync(type)
    .catch(() => performAndroidHapticsAsync(fallback))
    .catch(() => {});
}

/**
 * The app's only haptics, on three moments: a set deleted (confirm), an invalid value rolled
 * back on blur (reject) and a successful Finish (confirm). Only this file imports `expo-haptics`.
 */
export const haptics = {
  confirm: () => play(AndroidHaptics.Confirm, AndroidHaptics.Context_Click),
  reject: () => play(AndroidHaptics.Reject, AndroidHaptics.Long_Press),
};
