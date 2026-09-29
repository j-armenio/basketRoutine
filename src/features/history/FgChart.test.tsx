import { fireEvent, render, screen } from '@testing-library/react-native';
import { FgChart } from './FgChart';

const point = (id: number, day: number, fgPct: number) => ({
  id,
  name: `Workout ${id}`,
  startedAt: new Date(2026, 8, day, 10, id),
  fgPct,
});

test('draws once it knows its width: the axis, the latest value and one date per day', async () => {
  const points = [point(1, 25, 0.689), point(2, 25, 0.09), point(3, 28, 0.507)];
  await render(<FgChart points={points} />);
  const chart = screen.getByRole('image');
  // nothing to draw on until the width is known
  expect(screen.queryByText('100%')).toBeNull();

  await fireEvent(chart, 'layout', { nativeEvent: { layout: { width: 318, height: 150 } } });

  for (const label of ['100%', '50%', '0%', '50.7%', 'Sep 25', 'Sep 28']) {
    expect(screen.getByText(label)).toBeOnTheScreen();
  }
  expect(screen.getAllByText('Sep 25')).toHaveLength(1);
  expect(chart).toHaveProp(
    'accessibilityLabel',
    'FG% over the last 3 workouts: Sep 25 Workout 1 68.9%, Sep 25 Workout 2 9%, Sep 28 Workout 3 50.7%',
  );
});
