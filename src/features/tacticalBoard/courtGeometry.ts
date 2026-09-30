import {
  COURT_DEPTH_M,
  COURT_WIDTH_M,
  normalizePoint,
  type BoardPoint,
} from '@/domain/tacticalBoard';

// A FIBA half court in meters, as the SVG draws it: x across (0 and 15 are the sidelines), y from
// the baseline (0, the basket's end, at the top) to the half-court line (14, at the bottom).

/** Room around the court, so the outer lines aren't cut in half by the edge. */
export const PAD = 0.15;

export const VIEW_BOX = `${-PAD} ${-PAD} ${COURT_WIDTH_M + 2 * PAD} ${COURT_DEPTH_M + 2 * PAD}`;
const VIEW_WIDTH = COURT_WIDTH_M + 2 * PAD;
const VIEW_HEIGHT = COURT_DEPTH_M + 2 * PAD;

/** Width over height of the drawing: the court's proportion never changes. */
export const COURT_ASPECT = VIEW_WIDTH / VIEW_HEIGHT;

/** Height of the drawing for a width, in dp. */
export function courtHeight(width: number): number {
  return (width * VIEW_HEIGHT) / VIEW_WIDTH;
}

/** How many viewBox units (meters) one dp is, at this width: strokes are sized in dp. */
export function metersPerDp(width: number): number {
  return VIEW_WIDTH / width;
}

/** A touch on the drawing (dp from its top-left corner) as a normalized point on the court. */
export function pointFromView(x: number, y: number, width: number): BoardPoint {
  const perDp = metersPerDp(width);
  return normalizePoint([(x * perDp - PAD) / COURT_WIDTH_M, (y * perDp - PAD) / COURT_DEPTH_M]);
}

/** The inverse of `pointFromView`: where a normalized point sits on the drawing, in dp. */
export function viewFromPoint([nx, ny]: BoardPoint, width: number): [x: number, y: number] {
  const perDp = metersPerDp(width);
  return [(nx * COURT_WIDTH_M + PAD) / perDp, (ny * COURT_DEPTH_M + PAD) / perDp];
}

const BASKET_Y = 1.575;
const CENTER_X = COURT_WIDTH_M / 2;
const LANE_HALF_WIDTH = 2.45;
const LANE_DEPTH = 5.8;
const FREE_THROW_RADIUS = 1.8;
const THREE_RADIUS = 6.75;
const THREE_CORNER_X = 0.9;
/** Where the corner's straight line meets the arc. */
const THREE_CORNER_Y = BASKET_Y + Math.sqrt(THREE_RADIUS ** 2 - (CENTER_X - THREE_CORNER_X) ** 2);
const BACKBOARD_Y = 1.2;
const BACKBOARD_HALF_WIDTH = 0.9;
const RIM_RADIUS = 0.225;
const NO_CHARGE_RADIUS = 1.25;
const CENTER_RADIUS = 1.8;
const HASH_LENGTH = 0.15;
const HASH_Y = [2.9, 3.75, 4.6];

const n = (value: number) => String(Math.round(value * 1000) / 1000);

const laneLeft = CENTER_X - LANE_HALF_WIDTH;
const laneRight = CENTER_X + LANE_HALF_WIDTH;
const threeArc = `M${n(THREE_CORNER_X)} 0 V${n(THREE_CORNER_Y)} A${THREE_RADIUS} ${THREE_RADIUS} 0 0 0 ${n(COURT_WIDTH_M - THREE_CORNER_X)} ${n(THREE_CORNER_Y)} V0`;

export const court = {
  width: COURT_WIDTH_M,
  depth: COURT_DEPTH_M,
  /** The three-point area and the paint, filled a shade apart from the floor. */
  threeArea: `${threeArc} Z`,
  lane: { x: laneLeft, y: 0, width: 2 * LANE_HALF_WIDTH, height: LANE_DEPTH },
  /** Every solid line, in one path. */
  lines: [
    // The sidelines, the baseline and the half-court line.
    `M0 0 H${COURT_WIDTH_M} V${COURT_DEPTH_M} H0 Z`,
    threeArc,
    `M${n(laneLeft)} 0 V${LANE_DEPTH} H${n(laneRight)} V0`,
    ...HASH_Y.map(
      (y) =>
        `M${n(laneLeft)} ${y} H${n(laneLeft - HASH_LENGTH)} M${n(laneRight)} ${y} H${n(laneRight + HASH_LENGTH)}`,
    ),
    // The free-throw circle's half outside the paint.
    `M${n(CENTER_X - FREE_THROW_RADIUS)} ${LANE_DEPTH} A${FREE_THROW_RADIUS} ${FREE_THROW_RADIUS} 0 0 0 ${n(CENTER_X + FREE_THROW_RADIUS)} ${LANE_DEPTH}`,
    // The no-charge semicircle.
    `M${n(CENTER_X - NO_CHARGE_RADIUS)} ${BACKBOARD_Y} V${BASKET_Y} A${NO_CHARGE_RADIUS} ${NO_CHARGE_RADIUS} 0 0 0 ${n(CENTER_X + NO_CHARGE_RADIUS)} ${BASKET_Y} V${BACKBOARD_Y}`,
    // The backboard and the rim's neck.
    `M${n(CENTER_X - BACKBOARD_HALF_WIDTH)} ${BACKBOARD_Y} H${n(CENTER_X + BACKBOARD_HALF_WIDTH)} M${n(CENTER_X)} ${BACKBOARD_Y} V${n(BASKET_Y - RIM_RADIUS)}`,
    // The center circle's half on this side.
    `M${n(CENTER_X - CENTER_RADIUS)} ${COURT_DEPTH_M} A${CENTER_RADIUS} ${CENTER_RADIUS} 0 0 1 ${n(CENTER_X + CENTER_RADIUS)} ${COURT_DEPTH_M}`,
  ].join(' '),
  /** The free-throw circle's half inside the paint, dashed. */
  dashedLine: `M${n(CENTER_X - FREE_THROW_RADIUS)} ${LANE_DEPTH} A${FREE_THROW_RADIUS} ${FREE_THROW_RADIUS} 0 0 1 ${n(CENTER_X + FREE_THROW_RADIUS)} ${LANE_DEPTH}`,
  rim: { cx: CENTER_X, cy: BASKET_Y, r: RIM_RADIUS },
};

/** Half the size of an X mark, and the length of an arrow's head, in meters. */
export const MARK_HALF_SIZE_M = 0.35;
export const ARROW_HEAD_M = 0.6;
/** The side of the square handle a selected arrow shows at its curve point, in meters. */
export const HANDLE_SIZE_M = 0.5;
