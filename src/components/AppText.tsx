import { colors } from '@/theme/colors';
import { fonts, type FontWeight } from '@/theme/fonts';
import { typography, type TypographyVariant } from '@/theme/typography';
import { Text, type TextProps } from 'react-native';

const tones = {
  default: colors.textPrimary,
  secondary: colors.textSecondary,
  primary: colors.primary,
  green: colors.secondaryText,
  error: colors.error,
  success: colors.success,
  neutral: colors.neutralStat,
};

export type TextTone = keyof typeof tones;

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** Overrides the variant's weight (the mockups set a few texts bolder than their size's default). */
  weight?: FontWeight;
};

export function AppText({
  variant = 'body',
  tone = 'default',
  weight,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        typography[variant],
        { color: tones[tone] },
        weight && { fontFamily: fonts[weight] },
        style,
      ]}
      {...props}
    />
  );
}
