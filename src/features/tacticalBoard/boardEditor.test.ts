import { MAX_BOARD_ELEMENTS, type BoardPoint, type TacticalBoard } from '@/domain/tacticalBoard';
import {
  begin,
  canSave,
  canUndo,
  cancel,
  clear,
  editingElement,
  end,
  handlePoint,
  hasChanges,
  initialEditorState,
  move,
  previewElement,
  setTool,
  toBoard,
  undo,
  type BoardEditorState,
  type BoardTool,
} from './boardEditor';

const withTool = (tool: BoardTool) => setTool(initialEditorState(null), tool);

/** A gesture: lands on the first point, moves through the rest, lifts on the last. */
function drag(state: BoardEditorState, points: BoardPoint[]): BoardEditorState {
  let next = begin(state, points[0]);
  for (const point of points.slice(1, -1)) next = move(next, point);
  return end(next, points[points.length - 1]);
}

const tap = (state: BoardEditorState, point: BoardPoint) => drag(state, [point, point]);

describe('X', () => {
  test('a tap places an X where the finger lifts', () => {
    const state = drag(withTool('x'), [
      [0.3, 0.4],
      [0.3, 0.4],
    ]);
    expect(state.elements).toEqual([{ type: 'x', at: [0.3, 0.4] }]);
    expect(previewElement(state)).toBeNull();
  });

  test('the X follows the finger until it lifts', () => {
    const landed = begin(withTool('x'), [0.3, 0.4]);
    expect(previewElement(landed)).toEqual({ type: 'x', at: [0.3, 0.4] });
    expect(end(move(landed, [0.35, 0.4]), [0.4, 0.45]).elements).toEqual([
      { type: 'x', at: [0.4, 0.45] },
    ]);
  });
});

describe('arrow', () => {
  test('goes from where the finger lands to where it lifts, with a preview in between', () => {
    const moving = move(begin(withTool('arrow'), [0.2, 0.8]), [0.3, 0.6]);
    expect(previewElement(moving)).toEqual({ type: 'arrow', from: [0.2, 0.8], to: [0.3, 0.6] });
    expect(end(moving, [0.4, 0.5]).elements).toEqual([
      { type: 'arrow', from: [0.2, 0.8], to: [0.4, 0.5] },
    ]);
  });

  test('a short one is taken for a slip and dropped', () => {
    const state = drag(withTool('arrow'), [
      [0.5, 0.5],
      [0.51, 0.51],
    ]);
    expect(state.elements).toEqual([]);
  });
});

describe('pen', () => {
  test('a stroke is simplified when the finger lifts', () => {
    const line = Array.from({ length: 40 }, (_, i): BoardPoint => [0.1 + i / 100, 0.5]);
    const state = drag(withTool('pen'), line);
    expect(state.elements).toEqual([
      {
        type: 'pen',
        points: [
          [0.1, 0.5],
          [0.49, 0.5],
        ],
      },
    ]);
  });

  test('points too close to the last one are skipped while drawing', () => {
    let state = begin(withTool('pen'), [0.5, 0.5]);
    state = move(state, [0.5001, 0.5]);
    expect(previewElement(state)).toEqual({ type: 'pen', points: [[0.5, 0.5]] });
    state = move(state, [0.52, 0.5]);
    expect(previewElement(state)).toEqual({
      type: 'pen',
      points: [
        [0.5, 0.5],
        [0.52, 0.5],
      ],
    });
  });

  test('a tap with the pen draws nothing', () => {
    expect(
      drag(withTool('pen'), [
        [0.5, 0.5],
        [0.5, 0.5],
      ]).elements,
    ).toEqual([]);
  });
});

describe('the Hand tool', () => {
  function withMarks(): BoardEditorState {
    let state = drag(withTool('x'), [
      [0.2, 0.2],
      [0.2, 0.2],
    ]);
    state = drag(setTool(state, 'arrow'), [
      [0.3, 0.3],
      [0.6, 0.3],
    ]);
    return setTool(state, 'hand');
  }

  test('touching an element selects it, a plain tap adds no history', () => {
    const state = withMarks();
    const historyBefore = state.history.length;
    const touched = tap(state, [0.2, 0.2]);
    expect(touched.selected).toBe(0);
    expect(touched.history).toHaveLength(historyBefore);
  });

  test('touching empty space deselects', () => {
    const state = tap(withMarks(), [0.2, 0.2]);
    expect(state.selected).toBe(0);
    const deselected = tap(state, [0.9, 0.9]);
    expect(deselected.selected).toBeNull();
  });

  test('dragging a selected element moves it, clamped to the court, as one undo step', () => {
    const state = withMarks();
    const dragging = move(begin(state, [0.2, 0.2]), [0.25, 0.2]);
    expect(editingElement(dragging)).toEqual({ index: 0, element: { type: 'x', at: [0.25, 0.2] } });
    const moved = end(dragging, [-1, 0.2]); // dragged far left: clamped to the sideline
    expect(moved.elements[0]).toEqual({ type: 'x', at: [0, 0.2] });
    expect(canUndo(moved)).toBe(true);
    expect(undo(moved).elements[0]).toEqual({ type: 'x', at: [0.2, 0.2] });
  });

  test('touching an arrow shows its handle at the middle; dragging the handle curves it', () => {
    const selected = tap(withMarks(), [0.45, 0.3]); // the arrow's middle
    expect(handlePoint(selected)).toEqual([0.45, 0.3]);

    const curving = move(begin(selected, [0.45, 0.3]), [0.45, 0.1]);
    expect(handlePoint(curving)).toEqual([0.45, 0.1]);
    expect(editingElement(curving)?.element).toEqual({
      type: 'arrow',
      from: [0.3, 0.3],
      to: [0.6, 0.3],
      via: [0.45, 0.1],
    });

    const curved = end(curving, [0.45, 0.1]);
    expect(curved.elements[1]).toMatchObject({ via: [0.45, 0.1] });
    expect(handlePoint(curved)).toEqual([0.45, 0.1]); // still selected after dropping
    expect(canUndo(curved)).toBe(true);
    expect(undo(curved).elements[1]).not.toHaveProperty('via');
  });

  test('a non-arrow selection shows no handle', () => {
    const selected = tap(withMarks(), [0.2, 0.2]);
    expect(handlePoint(selected)).toBeNull();
  });
});

describe('the eraser', () => {
  function withMarks(): BoardEditorState {
    let state = drag(withTool('x'), [
      [0.2, 0.2],
      [0.2, 0.2],
    ]);
    state = drag(setTool(state, 'x'), [
      [0.8, 0.8],
      [0.8, 0.8],
    ]);
    return setTool(state, 'eraser');
  }

  test('touching a mark removes it at once, as one undo step', () => {
    const state = withMarks();
    const erased = tap(state, [0.2, 0.2]);
    expect(erased.elements).toEqual([{ type: 'x', at: [0.8, 0.8] }]);
    expect(canUndo(erased)).toBe(true);
    expect(undo(erased).elements).toHaveLength(2);
  });

  test('a swipe removes everything the finger crosses, and touching nothing adds no history', () => {
    const state = withMarks();
    const historyBefore = state.history.length;
    const missed = tap(state, [0.5, 0.5]);
    expect(missed.elements).toHaveLength(2);
    expect(missed.history).toHaveLength(historyBefore);

    const swept = drag(state, [
      [0.2, 0.2],
      [0.8, 0.8],
    ]);
    expect(swept.elements).toEqual([]);
  });

  test('a cancelled gesture restores whatever it had erased so far', () => {
    const state = withMarks();
    const erasing = move(begin(state, [0.2, 0.2]), [0.5, 0.5]);
    expect(erasing.elements).toHaveLength(1);
    expect(cancel(erasing).elements).toHaveLength(2);
  });
});

test('undo removes the last mark, clear removes them all', () => {
  let state = drag(withTool('x'), [
    [0.1, 0.1],
    [0.1, 0.1],
  ]);
  state = drag(state, [
    [0.2, 0.2],
    [0.2, 0.2],
  ]);
  expect(undo(state).elements).toEqual([{ type: 'x', at: [0.1, 0.1] }]);
  expect(undo(undo(undo(state))).elements).toEqual([]);
  expect(clear(state).elements).toEqual([]);
  expect(canUndo(clear(state))).toBe(true);
  expect(undo(clear(state)).elements).toHaveLength(2);
});

test('a cancelled draw adds nothing, and switching tools drops the preview and the selection', () => {
  const landed = begin(withTool('arrow'), [0.1, 0.1]);
  expect(cancel(landed)).toMatchObject({ gesture: null, elements: [] });
  const withSelection = {
    ...withTool('hand'),
    selected: 0,
    elements: [{ type: 'x' as const, at: [0.1, 0.1] as BoardPoint }],
  };
  expect(setTool(withSelection, 'pen')).toMatchObject({
    tool: 'pen',
    selected: null,
    gesture: null,
  });
});

test('no mark past the most a board holds', () => {
  const full: BoardEditorState = {
    ...withTool('x'),
    elements: Array.from({ length: MAX_BOARD_ELEMENTS }, () => ({
      type: 'x' as const,
      at: [0.5, 0.5] as BoardPoint,
    })),
  };
  expect(begin(full, [0.1, 0.1])).toBe(full);
});

describe('canSave', () => {
  test('false on an empty board, true with any mark', () => {
    expect(canSave(initialEditorState(null))).toBe(false);
    const state = drag(withTool('x'), [
      [0.1, 0.1],
      [0.1, 0.1],
    ]);
    expect(canSave(state)).toBe(true);
    expect(canSave(clear(state))).toBe(false);
  });
});

describe('hasChanges', () => {
  const saved: TacticalBoard = { version: 1, elements: [{ type: 'x', at: [0.1, 0.1] }] };

  test('opens with the saved marks and no change', () => {
    const state = initialEditorState(saved);
    expect(toBoard(state)).toEqual(saved);
    expect(hasChanges(saved, state)).toBe(false);
    expect(hasChanges(null, initialEditorState(null))).toBe(false);
  });

  test('a mark added or cleared is a change; undoing it back is not', () => {
    const state = initialEditorState(saved);
    const added = drag(state, [
      [0.5, 0.5],
      [0.5, 0.5],
    ]);
    expect(hasChanges(saved, added)).toBe(true);
    expect(hasChanges(saved, undo(added))).toBe(false);
    expect(hasChanges(saved, clear(state))).toBe(true);
  });

  test('erasing a loaded mark is a change, and so is a new board with a fresh one', () => {
    const erased = tap(setTool(initialEditorState(saved), 'eraser'), [0.1, 0.1]);
    expect(hasChanges(saved, erased)).toBe(true);
    expect(
      hasChanges(
        null,
        drag(initialEditorState(null), [
          [0.2, 0.2],
          [0.2, 0.2],
        ]),
      ),
    ).toBe(true);
  });
});
