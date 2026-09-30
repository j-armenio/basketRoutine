import type { BoardPoint } from '@/domain/tacticalBoard';
import {
  COURT_ASPECT,
  courtHeight,
  metersPerDp,
  pointFromView,
  viewFromPoint,
} from './courtGeometry';

describe('courtHeight and COURT_ASPECT', () => {
  test('the drawing keeps its half-court proportion at any width', () => {
    expect(courtHeight(300) / 300).toBeCloseTo(1 / COURT_ASPECT);
    expect(courtHeight(150) / 150).toBeCloseTo(courtHeight(300) / 300);
  });
});

describe('pointFromView and viewFromPoint', () => {
  test('are inverse: a normalized point maps to dp and back to the same point', () => {
    const width = 340;
    for (const point of [
      [0.5, 0.5],
      [0.1, 0.9],
      [0.99, 0.01],
    ] as BoardPoint[]) {
      const [x, y] = viewFromPoint(point, width);
      expect(pointFromView(x, y, width)).toEqual([point[0], point[1]]);
    }
  });

  test('a touch off either edge clamps to the court', () => {
    expect(pointFromView(-100, -100, 340)).toEqual([0, 0]);
    expect(pointFromView(10_000, 10_000, 340)).toEqual([1, 1]);
  });

  test('a narrower drawing means more meters per dp', () => {
    expect(metersPerDp(150)).toBeCloseTo(2 * metersPerDp(300));
  });

  test('the true midpoint of two dp points is the midpoint of their normalized points', () => {
    const width = 340;
    const a = pointFromView(50, 200, width);
    const b = pointFromView(250, 200, width);
    const mid = pointFromView(150, 200, width);
    expect(mid[0]).toBeCloseTo((a[0] + b[0]) / 2);
    expect(mid[1]).toBeCloseTo((a[1] + b[1]) / 2);
  });
});
