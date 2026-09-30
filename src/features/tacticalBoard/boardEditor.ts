import {
  arrowMidpoint,
  distanceM,
  eraseAt,
  hitElement,
  isArrowLongEnough,
  MAX_BOARD_ELEMENTS,
  MAX_STROKE_POINTS,
  sameBoard,
  sameElement,
  sameElements,
  simplifyStroke,
  translateElement,
  TOUCH_TOLERANCE_M,
  type ArrowElement,
  type BoardElement,
  type BoardPoint,
  type TacticalBoard,
} from '@/domain/tacticalBoard';

export type BoardTool = 'hand' | 'x' | 'arrow' | 'pen' | 'eraser';

/** A pen point closer than this to the last one adds nothing but weight. */
const MIN_PEN_STEP_M = 0.03;
/** The drag between two touch events is resampled at least this often, so a fast swipe of the
 *  eraser doesn't skip over a mark. */
const ERASE_SAMPLE_STEP_M = 0.3;

/** An X, arrow or stroke being drawn: not yet in `elements`. */
interface DrawGesture {
  kind: 'draw';
  element: BoardElement;
}
/** An existing element being dragged: `original` is where it started, `element` where it is now. */
interface MoveGesture {
  kind: 'move';
  index: number;
  start: BoardPoint;
  original: BoardElement;
  element: BoardElement;
}
/** The selected arrow's handle being dragged to bend it. */
interface CurveGesture {
  kind: 'curve';
  index: number;
  original: ArrowElement;
  element: ArrowElement;
}
/** Erasing: `before` is `elements` as the gesture started, `last` the most recent touch. */
interface EraseGesture {
  kind: 'erase';
  before: BoardElement[];
  last: BoardPoint;
}
type Gesture = DrawGesture | MoveGesture | CurveGesture | EraseGesture;

/** The board being edited, in memory until Save. */
export interface BoardEditorState {
  elements: BoardElement[];
  tool: BoardTool;
  /** The element the Hand tool last touched, by index into `elements`: shows the arrow handle. */
  selected: number | null;
  /** Previous `elements`, most recent last: each entry undoes one action. */
  history: BoardElement[][];
  /** What the finger is doing right now, if anything. */
  gesture: Gesture | null;
}

export function initialEditorState(board: TacticalBoard | null): BoardEditorState {
  return { elements: board?.elements ?? [], tool: 'x', selected: null, history: [], gesture: null };
}

export function toBoard(state: BoardEditorState): TacticalBoard {
  return { version: 1, elements: state.elements };
}

/** Whether Cancel would lose something: the marks differ from the ones the editor opened with. */
export function hasChanges(initial: TacticalBoard | null, state: BoardEditorState): boolean {
  return !sameBoard({ version: 1, elements: initial?.elements ?? [] }, toBoard(state));
}

export function canUndo(state: BoardEditorState): boolean {
  return state.history.length > 0;
}

/** Whether there is anything to save: a board is never saved empty (see `validateBoard`). */
export function canSave(state: BoardEditorState): boolean {
  return state.elements.length > 0;
}

/** The mark being drawn (X, arrow or pen), on top of the saved ones. */
export function previewElement(state: BoardEditorState): BoardElement | null {
  return state.gesture?.kind === 'draw' ? state.gesture.element : null;
}

/** The existing element being moved or curved, and the index it replaces once dropped. */
export function editingElement(
  state: BoardEditorState,
): { index: number; element: BoardElement } | null {
  const { gesture } = state;
  if (gesture?.kind === 'move' || gesture?.kind === 'curve') {
    return { index: gesture.index, element: gesture.element };
  }
  return null;
}

/** Where the curve handle shows: the selected arrow's middle, live while it's being dragged. */
export function handlePoint(state: BoardEditorState): BoardPoint | null {
  const editing = editingElement(state);
  const element = editing
    ? editing.element
    : state.tool === 'hand' && state.selected !== null
      ? state.elements[state.selected]
      : undefined;
  return element?.type === 'arrow' ? arrowMidpoint(element) : null;
}

export function setTool(state: BoardEditorState, tool: BoardTool): BoardEditorState {
  return { ...state, tool, selected: null, gesture: null };
}

/** `elements` shifted along the segment from `from` to `to`, sampled so a fast swipe erases too. */
function eraseAlong(
  elements: readonly BoardElement[],
  from: BoardPoint,
  to: BoardPoint,
  toleranceM: number,
): BoardElement[] {
  const steps = Math.max(1, Math.ceil(distanceM(from, to) / ERASE_SAMPLE_STEP_M));
  let result: BoardElement[] = [...elements];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const point: BoardPoint = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    result = eraseAt(result, point, toleranceM);
  }
  return result;
}

/**
 * The finger lands. Hand: the selected arrow's handle if it's touched, else the topmost element
 * under the finger (which becomes selected), else nothing (deselects). X / Arrow / Pen: starts a
 * new mark there. Eraser: removes whatever is touched.
 */
export function begin(state: BoardEditorState, point: BoardPoint): BoardEditorState {
  switch (state.tool) {
    case 'hand': {
      const selectedElement = state.selected !== null ? state.elements[state.selected] : undefined;
      if (
        selectedElement?.type === 'arrow' &&
        distanceM(arrowMidpoint(selectedElement), point) <= TOUCH_TOLERANCE_M
      ) {
        return {
          ...state,
          gesture: {
            kind: 'curve',
            index: state.selected!,
            original: selectedElement,
            element: selectedElement,
          },
        };
      }
      const hit = hitElement(state.elements, point, TOUCH_TOLERANCE_M);
      if (hit === undefined) return { ...state, selected: null, gesture: null };
      const original = state.elements[hit];
      return {
        ...state,
        selected: hit,
        gesture: { kind: 'move', index: hit, start: point, original, element: original },
      };
    }
    case 'x':
    case 'arrow':
    case 'pen': {
      if (state.elements.length >= MAX_BOARD_ELEMENTS) return state;
      const element: BoardElement =
        state.tool === 'x'
          ? { type: 'x', at: point }
          : state.tool === 'arrow'
            ? { type: 'arrow', from: point, to: point }
            : { type: 'pen', points: [point] };
      return { ...state, gesture: { kind: 'draw', element } };
    }
    case 'eraser': {
      const before = state.elements;
      return {
        ...state,
        elements: eraseAt(before, point, TOUCH_TOLERANCE_M),
        gesture: { kind: 'erase', before, last: point },
      };
    }
  }
}

/** The finger moves: the mark being drawn grows, the dragged element follows, erasing continues. */
export function move(state: BoardEditorState, point: BoardPoint): BoardEditorState {
  const { gesture } = state;
  if (!gesture) return state;
  switch (gesture.kind) {
    case 'draw': {
      const { element } = gesture;
      if (element.type === 'x') {
        return { ...state, gesture: { ...gesture, element: { ...element, at: point } } };
      }
      if (element.type === 'arrow') {
        return { ...state, gesture: { ...gesture, element: { ...element, to: point } } };
      }
      const last = element.points[element.points.length - 1];
      if (element.points.length >= MAX_STROKE_POINTS || distanceM(last, point) < MIN_PEN_STEP_M) {
        return state;
      }
      return {
        ...state,
        gesture: { ...gesture, element: { ...element, points: [...element.points, point] } },
      };
    }
    case 'move': {
      const dx = point[0] - gesture.start[0];
      const dy = point[1] - gesture.start[1];
      return {
        ...state,
        gesture: { ...gesture, element: translateElement(gesture.original, dx, dy) },
      };
    }
    case 'curve':
      return { ...state, gesture: { ...gesture, element: { ...gesture.original, via: point } } };
    case 'erase': {
      const elements = eraseAlong(state.elements, gesture.last, point, TOUCH_TOLERANCE_M);
      return { ...state, elements, gesture: { ...gesture, last: point } };
    }
  }
}

/**
 * The finger lifts at `point`: the gesture is committed. A new mark too short or too small to be
 * meant is dropped (a stroke is simplified first); a move or curve that changed nothing (a plain
 * tap) leaves no trace beyond the selection Hand already made; erasing that removed nothing is
 * likewise not recorded. Every real change becomes one `undo` step.
 */
export function end(state: BoardEditorState, point: BoardPoint): BoardEditorState {
  const moved = move(state, point);
  const { gesture } = moved;
  if (!gesture) return moved;
  const done = { ...moved, gesture: null };
  switch (gesture.kind) {
    case 'draw': {
      const { element } = gesture;
      if (element.type === 'arrow' && !isArrowLongEnough(element.from, element.to)) return done;
      if (element.type === 'pen' && element.points.length < 2) return done;
      const added: BoardElement =
        element.type === 'pen' ? { type: 'pen', points: simplifyStroke(element.points) } : element;
      return {
        ...done,
        elements: [...moved.elements, added],
        history: [...moved.history, moved.elements],
      };
    }
    case 'move':
    case 'curve': {
      if (sameElement(gesture.original, gesture.element)) return done;
      const elements = moved.elements.map((el, i) => (i === gesture.index ? gesture.element : el));
      return { ...done, elements, history: [...moved.history, moved.elements] };
    }
    case 'erase': {
      if (sameElements(gesture.before, moved.elements)) return done;
      return { ...done, history: [...moved.history, gesture.before] };
    }
  }
}

/** The gesture was taken away (by the system): erasing so far is undone, nothing else is added. */
export function cancel(state: BoardEditorState): BoardEditorState {
  const { gesture } = state;
  if (!gesture) return state;
  if (gesture.kind === 'erase') return { ...state, elements: gesture.before, gesture: null };
  return { ...state, gesture: null };
}

export function undo(state: BoardEditorState): BoardEditorState {
  if (state.history.length === 0) return state;
  const elements = state.history[state.history.length - 1];
  return { ...state, elements, history: state.history.slice(0, -1), gesture: null, selected: null };
}

export function clear(state: BoardEditorState): BoardEditorState {
  if (state.elements.length === 0) return { ...state, gesture: null, selected: null };
  return {
    ...state,
    elements: [],
    history: [...state.history, state.elements],
    gesture: null,
    selected: null,
  };
}
