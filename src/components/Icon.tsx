import { colors } from '@/theme/colors';
import type { ColorValue } from 'react-native';
import { SymbolView, type AndroidSymbol } from 'expo-symbols';

type IconProps = {
  name: AndroidSymbol;
  size?: number;
  color?: ColorValue;
};

// The only file that imports expo-symbols, so the library can be swapped in one place.
export function Icon({ name, size = 24, color = colors.text }: IconProps) {
  // `name` must be { android } (a string is read as an iOS SF Symbol) and `tintColor`
  // must be set (Android would otherwise use the wallpaper's Material You color).
  return <SymbolView name={{ android: name }} size={size} tintColor={color} />;
}
