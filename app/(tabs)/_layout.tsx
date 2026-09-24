import { Icon } from '@/components/Icon';
import { colors } from '@/theme/colors';
import { spacing, touch } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: typography.caption.fontSize, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: touch.primary + spacing.sm + insets.bottom,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs + insets.bottom,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workout',
          tabBarAccessibilityLabel: 'Workout',
          tabBarIcon: ({ color }) => <Icon name="sports_basketball" color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarAccessibilityLabel: 'Exercises',
          tabBarIcon: ({ color }) => <Icon name="format_list_bulleted" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarAccessibilityLabel: 'History',
          tabBarIcon: ({ color }) => <Icon name="history" color={color} />,
        }}
      />
    </Tabs>
  );
}
