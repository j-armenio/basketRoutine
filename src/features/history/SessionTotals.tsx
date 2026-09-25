import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { formatFgPct } from '@/domain/format';
import type { SessionSummary } from '@/domain/summary';

/** The totals of a finished session: shooting FG% and completed checks, each only when present. */
export function SessionTotals({ summary }: { summary: SessionSummary }) {
  return (
    <>
      {summary.shooting.attempts > 0 && (
        <Card>
          <AppText variant="heading">Shooting</AppText>
          <AppText variant="number">{formatFgPct(summary.shooting.fgPct)}</AppText>
          <AppText tone="muted">
            {summary.shooting.makes} makes / {summary.shooting.attempts} attempts
          </AppText>
        </Card>
      )}
      {summary.check.total > 0 && (
        <Card>
          <AppText variant="heading">Checks</AppText>
          <AppText variant="number">
            {summary.check.completed} / {summary.check.total}
          </AppText>
          <AppText tone="muted">completed</AppText>
        </Card>
      )}
    </>
  );
}
