import { render, screen } from '@testing-library/react-native';
import type { TacticalBoard } from '@/domain/tacticalBoard';
import { CourtBoard } from './CourtBoard';
import { courtHeight } from './courtGeometry';

const board: TacticalBoard = {
  version: 1,
  elements: [
    { type: 'x', at: [0.2, 0.3] },
    { type: 'x', at: [0.8, 0.3] },
    { type: 'arrow', from: [0.2, 0.3], to: [0.4, 0.1] },
    {
      type: 'pen',
      points: [
        [0.5, 0.6],
        [0.5, 0.4],
        [0.6, 0.2],
      ],
    },
  ],
};

const marks = (type: string) =>
  screen.queryAllByTestId(`board-mark-${type}`, { includeHiddenElements: true });

test('draws every mark of the board, and the preview on top', async () => {
  await render(<CourtBoard board={board} width={300} preview={{ type: 'x', at: [0.5, 0.5] }} />);
  expect(marks('x')).toHaveLength(3);
  expect(marks('arrow')).toHaveLength(1);
  expect(marks('pen')).toHaveLength(1);
});

test('keeps the half court proportion at any width', () => {
  expect(courtHeight(300) / 300).toBeCloseTo(courtHeight(150) / 150);
  expect(courtHeight(153)).toBeCloseTo(143);
});

test('an empty board draws only the court', async () => {
  await render(<CourtBoard board={null} width={200} compact />);
  expect(['x', 'arrow', 'pen'].flatMap(marks)).toHaveLength(0);
});

test('a curved arrow still draws as one arrow mark', async () => {
  const curved: TacticalBoard = {
    version: 1,
    elements: [{ type: 'arrow', from: [0.2, 0.2], to: [0.6, 0.2], via: [0.4, 0.05] }],
  };
  await render(<CourtBoard board={curved} width={300} />);
  expect(marks('arrow')).toHaveLength(1);
});

test('editing replaces an element instead of drawing it twice, and the handle shows', async () => {
  await render(
    <CourtBoard
      board={board}
      width={300}
      editing={{
        index: 2,
        element: { type: 'arrow', from: [0.2, 0.3], to: [0.4, 0.1], via: [0.3, 0.1] },
      }}
      handle={[0.3, 0.1]}
    />,
  );
  expect(marks('arrow')).toHaveLength(1);
  expect(screen.getAllByTestId('board-arrow-handle', { includeHiddenElements: true })).toHaveLength(
    1,
  );
});
