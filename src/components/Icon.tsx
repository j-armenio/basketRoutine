import { colors } from '@/theme/colors';
import { size as defaultSize } from '@/theme/spacing';
import { View, type ColorValue } from 'react-native';
import { SymbolView, type AndroidSymbol } from 'expo-symbols';

type IconProps = {
  name: AndroidSymbol;
  size?: number;
  color?: ColorValue;
  testID?: string;
};

// The only file that imports expo-symbols, so the library can be swapped in one place.
export function Icon({
  name,
  size = defaultSize.iconLarge,
  color = colors.textPrimary,
  testID,
}: IconProps) {
  // `name` must be { android } (a string is read as an iOS SF Symbol) and `tintColor`
  // must be set (Android would otherwise use the wallpaper's Material You color).
  const symbol = <SymbolView name={{ android: name }} size={size} tintColor={color} />;
  // SymbolView doesn't pass a testID on, so a test that looks for the icon finds this view.
  return testID ? <View testID={testID}>{symbol}</View> : symbol;
}
