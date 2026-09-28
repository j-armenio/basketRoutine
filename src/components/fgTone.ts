import type { FgBand } from '@/domain/fg';
import type { TextTone } from './AppText';

/**
 * The text tone of an FG%: green when good, red when poor, and in between the tone the place
 * already uses (`neutral`). No value stays muted.
 */
export function fgTone(band: FgBand, neutral: TextTone): TextTone {
  switch (band) {
    case 'good':
      return 'success';
    case 'poor':
      return 'danger';
    case 'neutral':
      return neutral;
    case 'none':
      return 'muted';
  }
}
