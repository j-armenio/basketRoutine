import { colors } from '@/theme/colors';
import { border, size, spacing } from '@/theme/spacing';
import type {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
} from 'expo-router/js-top-tabs';
import {
  CommonActions,
  type NavigationHelpers,
  type ParamListBase,
  type TabNavigationState,
} from 'expo-router/react-navigation';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useKeyboardVisible } from './useKeyboardVisible';

export type TabBarProps = {
  state: TabNavigationState<ParamListBase>;
  descriptors: Record<string, { options: MaterialTopTabNavigationOptions }>;
  navigation: NavigationHelpers<ParamListBase, MaterialTopTabNavigationEventMap>;
};

/**
 * The bottom navigation: each tab's icon and label, the active one with a green pill behind its
 * icon and a green label. Hidden while the keyboard is open. Each item has the `tab` role and the
 * screen's `tabBarAccessibilityLabel`.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;

  return (
    <View
      style={[
        styles.bar,
        { height: size.bottomNavHeight + insets.bottom, paddingBottom: spacing.md + insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = typeof options.title === 'string' ? options.title : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.dispatch({
              ...CommonActions.navigate(route),
              target: state.key,
            });
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            accessibilityState={{ selected: focused }}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.item}
          >
            <View style={styles.pill}>
              {/* Mounted with the active tab rather than a background switched on later: Android
                  drew a background added to an existing view without its rounded corners. */}
              {focused && <View testID="tab-pill" style={styles.pillActive} />}
              {options.tabBarIcon?.({
                focused,
                color: focused ? colors.onSecondary : colors.textSecondary,
              })}
            </View>
            <AppText
              variant="label"
              weight={focused ? 'bold' : 'semiBold'}
              tone={focused ? 'green' : 'secondary'}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: border.hairline,
    borderTopColor: colors.divider,
    backgroundColor: colors.backgroundDeep,
  },
  item: {
    flex: 1,
    minHeight: size.navPillWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xsPlus,
  },
  pill: {
    width: size.navPillWidth,
    height: size.navPillHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: size.navPillHeight / 2,
    backgroundColor: colors.secondary,
  },
});
