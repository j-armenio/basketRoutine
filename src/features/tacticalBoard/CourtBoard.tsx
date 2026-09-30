import {
  arrowControlPoint,
  arrowHead,
  smoothPath,
  toMeters,
  type BoardElement,
  type BoardPoint,
  type TacticalBoard,
} from '@/domain/tacticalBoard';
import { colors } from '@/theme/colors';
import { boardStroke } from '@/theme/spacing';
import { memo, useMemo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  ARROW_HEAD_M,
  court,
  courtHeight,
  HANDLE_SIZE_M,
  MARK_HALF_SIZE_M,
  metersPerDp,
  VIEW_BOX,
} from './courtGeometry';

type CourtBoardProps = {
  board: TacticalBoard | null;
  /** In dp; the height follows the court's proportion. */
  width: number;
  /** The mark being drawn, over the others. */
  preview?: BoardElement | null;
  /** An existing element being moved or curved: drawn instead of `board.elements[index]`. */
  editing?: { index: number; element: BoardElement } | null;
  /** The selected arrow's curve handle (Hand tool only). */
  handle?: BoardPoint | null;
  /** The thumbnail's thinner strokes. */
  compact?: boolean;
};

type Strokes = { line: number; mark: number; halo: number };

const pair = ([x, y]: BoardPoint) =>
  `${Math.round(x * 1000) / 1000} ${Math.round(y * 1000) / 1000}`;

/** The element's path in meters, the viewBox's unit. */
function markPath(element: BoardElement): string {
  switch (element.type) {
    case 'x': {
      const [x, y] = toMeters(element.at);
      const h = MARK_HALF_SIZE_M;
      return `M${pair([x - h, y - h])} L${pair([x + h, y + h])} M${pair([x + h, y - h])} L${pair([x - h, y + h])}`;
    }
    case 'arrow': {
      const from = toMeters(element.from);
      const to = toMeters(element.to);
      if (!element.via) {
        const [left, right] = arrowHead(from, to, ARROW_HEAD_M);
        return `M${pair(from)} L${pair(to)} M${pair(left)} L${pair(to)} L${pair(right)}`;
      }
      // The control point's tangent at `to` is also the arrowhead's angle.
      const control = arrowControlPoint(from, to, toMeters(element.via));
      const [left, right] = arrowHead(control, to, ARROW_HEAD_M);
      return `M${pair(from)} Q${pair(control)} ${pair(to)} M${pair(left)} L${pair(to)} L${pair(right)}`;
    }
    case 'pen':
      return smoothPath(element.points.map(toMeters));
  }
}

const Mark = memo(function Mark({ element, strokes }: { element: BoardElement; strokes: Strokes }) {
  const d = markPath(element);
  const color = element.type === 'pen' ? colors.primary : colors.textPrimary;
  return (
    <>
      <Path
        d={d}
        fill="none"
        stroke={colors.boardHalo}
        strokeWidth={strokes.halo}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        testID={`board-mark-${element.type}`}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokes.mark}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
});

const Handle = memo(function Handle({ point, strokes }: { point: BoardPoint; strokes: Strokes }) {
  const [cx, cy] = toMeters(point);
  const size = HANDLE_SIZE_M;
  const halo = size * 1.6;
  const corner = size * 0.15;
  return (
    <>
      <Rect
        x={cx - halo / 2}
        y={cy - halo / 2}
        width={halo}
        height={halo}
        rx={corner}
        fill={colors.boardHalo}
      />
      <Rect
        testID="board-arrow-handle"
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        rx={corner}
        fill={colors.textPrimary}
        stroke={colors.backgroundDeep}
        strokeWidth={strokes.line}
      />
    </>
  );
});

// Drawn once per size: dragging a mark only redraws the marks.
const Court = memo(function Court({ lineWidth }: { lineWidth: number }) {
  const line = { fill: 'none', stroke: colors.courtLine, strokeWidth: lineWidth } as const;
  return (
    <>
      <Rect x={-1} y={-1} width={court.width + 2} height={court.depth + 2} fill={colors.court} />
      <Path d={court.threeArea} fill={colors.courtArc} />
      <Rect {...court.lane} fill={colors.courtPaint} />
      <Path d={court.lines} {...line} strokeLinejoin="round" />
      <Path d={court.dashedLine} {...line} strokeDasharray={[0.3, 0.3]} />
      <Circle {...court.rim} {...line} />
    </>
  );
});

/**
 * A tactical board on a FIBA half court: the one renderer of the thumbnail, the editor and
 * History, so a board looks the same at every size. Not accessible itself: the thumbnail or the
 * editor names it.
 */
export function CourtBoard({
  board,
  width,
  preview,
  editing,
  handle,
  compact = false,
}: CourtBoardProps) {
  const strokes = useMemo((): Strokes => {
    const perDp = metersPerDp(width);
    const dp = compact ? boardStroke.compact : boardStroke;
    return { line: dp.line * perDp, mark: dp.mark * perDp, halo: dp.halo * perDp };
  }, [width, compact]);
  return (
    <Svg
      width={width}
      height={courtHeight(width)}
      viewBox={VIEW_BOX}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Court lineWidth={strokes.line} />
      {board?.elements.map((element, i) =>
        editing?.index === i ? null : <Mark key={i} element={element} strokes={strokes} />,
      )}
      {editing && <Mark element={editing.element} strokes={strokes} />}
      {preview && <Mark element={preview} strokes={strokes} />}
      {handle && <Handle point={handle} strokes={strokes} />}
    </Svg>
  );
}
