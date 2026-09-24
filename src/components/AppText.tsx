import { colors } from '@/theme/colors';
import { typography, type TypographyVariant } from '@/theme/typography';
import { Text, type TextProps } from 'react-native';

const tones = {
  default: colors.text,
  muted: colors.textMuted,
  accent: colors.accent,
  danger: colors.danger,
};

export type TextTone = keyof typeof tones;

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
};

export function AppText({ variant = 'body', tone = 'default', style, ...props }: AppTextProps) {
  return <Text style={[typography[variant], { color: tones[tone] }, style]} {...props} />;
}
