// Plus Jakarta Sans (SIL Open Font License, assets/fonts/OFL.txt), one family per weight.
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
};

export type FontWeight = keyof typeof fonts;

/** What `useFonts` loads behind the splash. */
export const fontFiles = {
  [fonts.regular]: require('../../assets/fonts/PlusJakartaSans_400Regular.ttf'),
  [fonts.semiBold]: require('../../assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
  [fonts.bold]: require('../../assets/fonts/PlusJakartaSans_700Bold.ttf'),
  [fonts.extraBold]: require('../../assets/fonts/PlusJakartaSans_800ExtraBold.ttf'),
};
