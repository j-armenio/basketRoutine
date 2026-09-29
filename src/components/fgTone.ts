import type { FgBand } from '@/domain/fg';
import type { TextTone } from './AppText';

/** The text tone of an FG%: green when good, red when poor, neutral in between. No value is secondary. */
export function fgTone(band: FgBand): TextTone {
  switch (band) {
    case 'good':
      return 'success';
    case 'poor':
      return 'error';
    case 'neutral':
      return 'neutral';
    case 'none':
      return 'secondary';
  }
}
