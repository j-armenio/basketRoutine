import { act, render, screen } from '@testing-library/react-native';
import { ElapsedTimer } from './ElapsedTimer';

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-09-28T18:00:00Z') });
});

afterEach(() => {
  jest.useRealTimers();
});

test('counts the time since the start, every second', async () => {
  // Started 12 min 34 s ago: the timer reads from the clock, not from when it mounted.
  await render(<ElapsedTimer start={new Date('2026-09-28T17:47:26Z')} />);
  expect(screen.getByRole('timer', { name: 'Elapsed time 12:34' })).toBeOnTheScreen();
  expect(screen.getByText('12:34')).toBeOnTheScreen();

  await act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText('12:35')).toBeOnTheScreen();

  await act(() => jest.advanceTimersByTime(60 * 60 * 1000));
  expect(screen.getByRole('timer', { name: 'Elapsed time 1:12:35' })).toBeOnTheScreen();
});
