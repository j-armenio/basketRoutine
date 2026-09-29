import { AppText } from '@/components/AppText';
import { formatFgPct } from '@/domain/format';
import { colors } from '@/theme/colors';
import { border, radius, size, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { chartDateLabels, fgEvolutionLabel, type FgPoint } from './historyList';

// The geometry of the History mockup's chart, in dp: the y-axis labels on the left, the plot
// between the 100% and 0% lines, the date labels under it.
const AXIS_WIDTH = 36;
const AXIS_LABEL_WIDTH = 28;
const PLOT_TOP = 10;
const PLOT_BOTTOM = 120;
const DATE_TOP = 132;
const INSET_LEFT = 12;
const INSET_RIGHT = 22;
const LINE_WIDTH = 2;
const DOT = 9;
const LAST_DOT = 12;
const DOT_BORDER = 2;
const LABEL_BOX = 64;
const GRID = [
  { ratio: 1, label: '100%' },
  { ratio: 0.5, label: '50%' },
  { ratio: 0, label: '0%' },
];

const yOf = (ratio: number) => PLOT_TOP + (1 - ratio) * (PLOT_BOTTOM - PLOT_TOP);

/**
 * A line chart of FG% per session, drawn with plain views (no chart library): a 0 / 50 / 100%
 * grid, a segment between consecutive points, a dot per point, the latest one larger with its
 * value above it, and the dates under the points. One `image` element for screen readers, whose
 * label lists every point.
 */
export function FgChart({ points }: { points: FgPoint[] }) {
  const [width, setWidth] = useState(0);
  const left = AXIS_WIDTH + INSET_LEFT;
  const right = width - INSET_RIGHT;
  const step = points.length > 1 ? (right - left) / (points.length - 1) : 0;
  const xOf = (index: number) => (points.length > 1 ? left + index * step : (left + right) / 2);
  const coords = points.map((point, index) => ({ x: xOf(index), y: yOf(point.fgPct) }));
  const last = coords.at(-1);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={fgEvolutionLabel(points)}
      style={styles.chart}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <>
          {GRID.map(({ ratio, label }) => (
            <View key={label}>
              <View style={[styles.gridLine, { top: yOf(ratio) }]} />
              <AppText
                variant="micro"
                tone="secondary"
                style={[styles.axisLabel, { top: yOf(ratio) - typography.micro.lineHeight / 2 }]}
              >
                {label}
              </AppText>
            </View>
          ))}
          {coords.slice(1).map((end, index) => {
            const start = coords[index];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.hypot(dx, dy);
            return (
              <View
                key={points[index + 1].id}
                style={[
                  styles.segment,
                  {
                    left: (start.x + end.x) / 2 - length / 2,
                    top: (start.y + end.y) / 2 - LINE_WIDTH / 2,
                    width: length,
                    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                  },
                ]}
              />
            );
          })}
          {coords.map(({ x, y }, index) => {
            const dot = index === coords.length - 1 ? LAST_DOT : DOT;
            return (
              <View
                key={points[index].id}
                style={[
                  styles.dot,
                  { left: x - dot / 2, top: y - dot / 2, width: dot, height: dot },
                ]}
              />
            );
          })}
          {last && (
            <AppText
              variant="caption"
              weight="bold"
              style={[
                styles.centeredLabel,
                { left: last.x - LABEL_BOX / 2, top: last.y - LAST_DOT / 2 - spacing.xl },
              ]}
            >
              {formatFgPct(points[points.length - 1].fgPct)}
            </AppText>
          )}
          {chartDateLabels(points).map(({ label, first, last: lastIndex }) => (
            <AppText
              key={label}
              variant="micro"
              tone="secondary"
              style={[
                styles.centeredLabel,
                { left: (xOf(first) + xOf(lastIndex)) / 2 - LABEL_BOX / 2, top: DATE_TOP },
              ]}
            >
              {label}
            </AppText>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: size.chartHeight,
  },
  gridLine: {
    position: 'absolute',
    left: AXIS_WIDTH,
    right: 0,
    height: border.hairline,
    backgroundColor: colors.outline,
  },
  axisLabel: {
    position: 'absolute',
    left: 0,
    width: AXIS_LABEL_WIDTH,
    textAlign: 'right',
  },
  segment: {
    position: 'absolute',
    height: LINE_WIDTH,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  dot: {
    position: 'absolute',
    borderRadius: radius.pill,
    borderWidth: DOT_BORDER,
    borderColor: colors.surface,
    backgroundColor: colors.primary,
  },
  centeredLabel: {
    position: 'absolute',
    width: LABEL_BOX,
    textAlign: 'center',
  },
});
