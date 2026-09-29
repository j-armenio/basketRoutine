import { Icon } from '@/components/Icon';
import { TabBar } from '@/components/TabBar';
import { colors } from '@/theme/colors';
import { ResumeBanner } from '@/features/workout/ResumeBanner';
import { Tabs } from 'expo-router/js-tabs';

export default function TabsLayout() {
  return (
    <Tabs
      // The banner sits above the bar and stays up while the keyboard is open: the bar hides
      // itself then.
      tabBar={(props) => (
        <>
          <ResumeBanner />
          <TabBar {...props} />
        </>
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workout',
          tabBarAccessibilityLabel: 'Workout',
          tabBarIcon: ({ color, size }) => (
            <Icon name="sports_basketball" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarAccessibilityLabel: 'Exercises',
          tabBarIcon: ({ color, size }) => (
            <Icon name="format_list_bulleted" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarAccessibilityLabel: 'History',
          tabBarIcon: ({ color, size }) => <Icon name="history" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
