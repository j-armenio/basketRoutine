import { DarkTheme, type Theme } from 'expo-router';
import { colors } from './colors';

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.backgroundDeep,
    text: colors.textPrimary,
    border: colors.divider,
  },
};
