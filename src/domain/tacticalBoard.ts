import type { ValidationResult } from './validation';

/** A FIBA half court: 15 m wide, 14 m from the baseline to the half-court line. */
export const COURT_WIDTH_M = 15;
export const COURT_DEPTH_M = 14;

/**
 * A point on the court, normalized: x from 0 (left sideline) to 1 (right sideline), y from 0 (the
 * baseline, under the basket) to 1 (the half-court line). The same board draws alike at any size.
 */
export type BoardPoint = [x: number, y: number];

export type BoardElement =
  | { type: 'x'; at: BoardPoint }
  | {
      type: 'arrow';
      from: BoardPoint;
      to: BoardPoint;
      /** Where the curve passes at its middle. Absent: a straight arrow. */
      via?: BoardPoint;
    }
  | { type: 'pen'; points: BoardPoint[] };

export type ArrowElement = Extract<BoardElement, { type: 'arrow' }>;

/** An exercise's tactical board, stored as data (JSON), never as an image. */
export interface TacticalBoard {
  version: 1;
  elements: BoardElement[];
}

export const MAX_BOARD_ELEMENTS = 200;
export const MAX_STROKE_POINTS = 500;
/** Shorter arrows are taken for a slip of the finger and dropped. */
export const MIN_ARROW_LENGTH_M = 0.5;
/** How far a simplified stroke may stray from the drawn one: well under a line's width. */
export const SIMPLIFY_TOLERANCE_M = 0.05;
/** How close a touch must land to a mark to select, drag or erase it. */
export const TOUCH_TOLERANCE_M = 0.8;

export function emptyBoard(): TacticalBoard {
  return { version: 1, elements: [] };
}

/** The point in meters, for distances and drawing. */
export function toMeters([x, y]: BoardPoint): BoardPoint {
  return [x * COURT_WIDTH_M, y * COURT_DEPTH_M];
}

/** Distance in meters between two normalized points. */
export function distanceM(a: BoardPoint, b: BoardPoint): number {
  return Math.hypot((a[0] - b[0]) * COURT_WIDTH_M, (a[1] - b[1]) * COURT_DEPTH_M);
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

/** Kept on the court and rounded to 4 decimals (1.5 mm): enough for any screen, and small JSON. */
export function normalizePoint([x, y]: BoardPoint): BoardPoint {
  return [round4(clamp01(x)), round4(clamp01(y))];
}

export function isArrowLongEnough(from: BoardPoint, to: BoardPoint): boolean {
  return distanceM(from, to) >= MIN_ARROW_LENGTH_M;
}

/** Distance in meters from `p` to the segment `a`-`b`. */
function distanceToSegmentM(p: BoardPoint, a: BoardPoint, b: BoardPoint): number {
  const [px, py] = toMeters(p);
  const [ax, ay] = toMeters(a);
  const [bx, by] = toMeters(b);
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** The shortest distance, in meters, from `points`' polyline to `p`. */
function distanceToPolylineM(points: readonly BoardPoint[], p: BoardPoint): number {
  let min = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    min = Math.min(min, distanceToSegmentM(p, points[i], points[i + 1]));
  }
  return min;
}

/**
 * Fewer points, same visible shape (Ramer-Douglas-Peucker): a point stays only when leaving it out
 * would move the line by more than `SIMPLIFY_TOLERANCE_M`. The ends always stay; the points come
 * back normalized.
 */
export function simplifyStroke(points: readonly BoardPoint[]): BoardPoint[] {
  const normalized = points.map(normalizePoint);
  if (normalized.length <= 2) return normalized;
  const keep = new Array<boolean>(normalized.length).fill(false);
  keep[0] = true;
  keep[normalized.length - 1] = true;
  const stack: [number, number][] = [[0, normalized.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let farthest = -1;
    let farthestDistance = 0;
    for (let i = first + 1; i < last; i += 1) {
      const distance = distanceToSegmentM(normalized[i], normalized[first], normalized[last]);
      if (distance > farthestDistance) {
        farthest = i;
        farthestDistance = distance;
      }
    }
    if (farthest !== -1 && farthestDistance > SIMPLIFY_TOLERANCE_M) {
      keep[farthest] = true;
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return normalized.filter((_, i) => keep[i]);
}

const HEAD_ANGLE = (28 * Math.PI) / 180;

/**
 * The two ends of an arrow's head, drawn back from `to` at `length`. `tangentOrigin` is the point
 * the head's angle is measured from: `from` for a straight arrow, the curve's control point for a
 * curved one (its tangent at the tip). Points in any one unit (the renderer passes meters).
 */
export function arrowHead(
  tangentOrigin: BoardPoint,
  to: BoardPoint,
  length: number,
): [left: BoardPoint, right: BoardPoint] {
  const angle = Math.atan2(to[1] - tangentOrigin[1], to[0] - tangentOrigin[0]);
  const end = (turn: number): BoardPoint => [
    to[0] - length * Math.cos(angle + turn),
    to[1] - length * Math.sin(angle + turn),
  ];
  return [end(HEAD_ANGLE), end(-HEAD_ANGLE)];
}

const midpoint = (a: BoardPoint, b: BoardPoint): BoardPoint => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
];

/** Where the curve handle sits: where it was last dragged to, or the arrow's own middle. */
export function arrowMidpoint(arrow: {
  from: BoardPoint;
  to: BoardPoint;
  via?: BoardPoint;
}): BoardPoint {
  return arrow.via ?? normalizePoint(midpoint(arrow.from, arrow.to));
}

/**
 * The quadratic Bézier control point that makes the curve pass through `via` at its middle (a
 * quadratic curve's midpoint is the average of its control point and its own straight-line
 * midpoint, so the control point is twice `via` minus that midpoint). Unit-agnostic: pass
 * normalized points or meters, consistently.
 */
export function arrowControlPoint(from: BoardPoint, to: BoardPoint, via: BoardPoint): BoardPoint {
  const mid = midpoint(from, to);
  return [2 * via[0] - mid[0], 2 * via[1] - mid[1]];
}

function sampleQuadratic(
  from: BoardPoint,
  control: BoardPoint,
  to: BoardPoint,
  steps = 12,
): BoardPoint[] {
  const points: BoardPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    points.push([
      mt * mt * from[0] + 2 * mt * t * control[0] + t * t * to[0],
      mt * mt * from[1] + 2 * mt * t * control[1] + t * t * to[1],
    ]);
  }
  return points;
}

const num = (value: number) => String(Math.round(value * 1000) / 1000);
const pair = ([x, y]: BoardPoint) => `${num(x)} ${num(y)}`;

/**
 * An SVG path through the points, smoothed: a quadratic curve from one segment's middle to the
 * next, each point used as the control point. Points in the SVG's own unit.
 */
export function smoothPath(points: readonly BoardPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${pair(points[0])}`;
  let d = `M${pair(points[0])}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q${pair(points[i])} ${pair([(x + nx) / 2, (y + ny) / 2])}`;
  }
  return `${d} L${pair(points[points.length - 1])}`;
}

/** The distance in meters from `point` to the nearest part of `element`. */
export function distanceToElementM(element: BoardElement, point: BoardPoint): number {
  switch (element.type) {
    case 'x':
      return distanceM(point, element.at);
    case 'arrow':
      if (!element.via) return distanceToSegmentM(point, element.from, element.to);
      return distanceToPolylineM(
        sampleQuadratic(
          element.from,
          arrowControlPoint(element.from, element.to, element.via),
          element.to,
        ),
        point,
      );
    case 'pen':
      return distanceToPolylineM(element.points, point);
  }
}

/** The topmost element within `toleranceM` of `point` (later elements are drawn on top), if any. */
export function hitElement(
  elements: readonly BoardElement[],
  point: BoardPoint,
  toleranceM: number,
): number | undefined {
  for (let i = elements.length - 1; i >= 0; i -= 1) {
    if (distanceToElementM(elements[i], point) <= toleranceM) return i;
  }
  return undefined;
}

/** `elements` with every one touched by `point` (within `toleranceM`) removed. */
export function eraseAt(
  elements: readonly BoardElement[],
  point: BoardPoint,
  toleranceM: number,
): BoardElement[] {
  return elements.filter((element) => distanceToElementM(element, point) > toleranceM);
}

function elementPoints(element: BoardElement): BoardPoint[] {
  switch (element.type) {
    case 'x':
      return [element.at];
    case 'arrow':
      return element.via ? [element.from, element.to, element.via] : [element.from, element.to];
    case 'pen':
      return element.points;
  }
}

/** How much of (dx, dy) fits before `points`' bounding box would leave the court. */
function clampTranslation(points: readonly BoardPoint[], dx: number, dy: number): [number, number] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return [Math.min(Math.max(dx, -minX), 1 - maxX), Math.min(Math.max(dy, -minY), 1 - maxY)];
}

/** `element` shifted by (dx, dy), clamped so it stays on the court. */
export function translateElement(element: BoardElement, dx: number, dy: number): BoardElement {
  const [cdx, cdy] = clampTranslation(elementPoints(element), dx, dy);
  const shift = (p: BoardPoint): BoardPoint => normalizePoint([p[0] + cdx, p[1] + cdy]);
  switch (element.type) {
    case 'x':
      return { type: 'x', at: shift(element.at) };
    case 'arrow':
      return {
        type: 'arrow',
        from: shift(element.from),
        to: shift(element.to),
        ...(element.via ? { via: shift(element.via) } : {}),
      };
    case 'pen':
      return { type: 'pen', points: element.points.map(shift) };
  }
}

const samePoint = (a: BoardPoint, b: BoardPoint) => a[0] === b[0] && a[1] === b[1];
const sameOptionalPoint = (a: BoardPoint | undefined, b: BoardPoint | undefined) =>
  a === undefined || b === undefined ? a === b : samePoint(a, b);

export function sameElement(a: BoardElement, b: BoardElement): boolean {
  if (a.type === 'x' && b.type === 'x') return samePoint(a.at, b.at);
  if (a.type === 'arrow' && b.type === 'arrow') {
    return samePoint(a.from, b.from) && samePoint(a.to, b.to) && sameOptionalPoint(a.via, b.via);
  }
  if (a.type === 'pen' && b.type === 'pen') {
    return (
      a.points.length === b.points.length && a.points.every((p, i) => samePoint(p, b.points[i]))
    );
  }
  return false;
}

export function sameElements(a: readonly BoardElement[], b: readonly BoardElement[]): boolean {
  return a.length === b.length && a.every((element, i) => sameElement(element, b[i]));
}

/** No board and an empty one differ: an empty board still shows on the card. */
export function sameBoard(a: TacticalBoard | null, b: TacticalBoard | null): boolean {
  if (a === null || b === null) return a === b;
  return sameElements(a.elements, b.elements);
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** For screen readers: "Tactical board: 3 X marks, 2 arrows, 1 line". */
export function describeBoard(board: TacticalBoard): string {
  const count = (type: BoardElement['type']) =>
    board.elements.filter((element) => element.type === type).length;
  const parts = [
    [count('x'), 'X mark', 'X marks'],
    [count('arrow'), 'arrow', 'arrows'],
    [count('pen'), 'line', 'lines'],
  ] as const;
  const shown = parts.filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many));
  return shown.length === 0 ? 'Empty tactical board' : `Tactical board: ${shown.join(', ')}`;
}

const OK: ValidationResult = { ok: true };
const INVALID: ValidationResult = { ok: false, reason: 'invalid_board' };

function isPoint(value: unknown): value is BoardPoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)
  );
}

function isElement(value: unknown): value is BoardElement {
  if (typeof value !== 'object' || value === null) return false;
  const element = value as Record<string, unknown>;
  switch (element.type) {
    case 'x':
      return isPoint(element.at);
    case 'arrow':
      return (
        isPoint(element.from) &&
        isPoint(element.to) &&
        (element.via === undefined || isPoint(element.via))
      );
    case 'pen':
      return (
        Array.isArray(element.points) &&
        element.points.length >= 2 &&
        element.points.length <= MAX_STROKE_POINTS &&
        element.points.every(isPoint)
      );
    default:
      return false;
  }
}

/**
 * A board as it would be stored: version 1, known elements, every point on the court. Never
 * empty: a board with nothing on it isn't saved, only removed (see `TacticalBoardSlot`).
 */
export function validateBoard(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null) return INVALID;
  const board = value as Record<string, unknown>;
  if (board.version !== 1 || !Array.isArray(board.elements)) return INVALID;
  if (board.elements.length === 0 || board.elements.length > MAX_BOARD_ELEMENTS) return INVALID;
  return board.elements.every(isElement) ? OK : INVALID;
}
