import { Icon } from '@/components/Icon';
import { TabBar, type TabBarProps } from '@/components/TabBar';
import { colors } from '@/theme/colors';
import { size } from '@/theme/spacing';
import { ResumeBanner } from '@/features/workout/ResumeBanner';
import type { AndroidSymbol } from 'expo-symbols';
import { TopTabs } from 'expo-router/js-top-tabs';
import { useWindowDimensions, type ColorValue } from 'react-native';

// The navigator's props are loosely typed, so the bar's and the icons' arguments are spelled out.
function tabIcon(name: AndroidSymbol) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={size.icon} color={color} />;
  };
}

// Material top tabs with the bar at the bottom: the pages sit in a native pager, so the screen
// follows the finger sideways from one tab to the next.
export default function TabsLayout() {
  const { width } = useWindowDimensions();
  return (
    <TopTabs
      tabBarPosition="bottom"
      // The pager's width before its first layout: without it, only the focused page renders
      // until then (and, where no layout ever comes, as in Jest, the others unmount).
      initialLayout={{ width }}
      // The banner sits above the bar and stays up while the keyboard is open: the bar hides
      // itself then.
      tabBar={(props: TabBarProps) => (
        <>
          <ResumeBanner />
          <TabBar {...props} />
        </>
      )}
      screenOptions={{
        sceneStyle: { backgroundColor: colors.background },
        // A tab renders on its first visit, or once a neighbor is focused (so the page dragged
        // in is ready), then stays mounted: Profile's history read waits until it's near.
        lazy: true,
        lazyPreloadDistance: 1,
      }}
    >
      <TopTabs.Screen
        name="index"
        options={{
          title: 'Workout',
          tabBarAccessibilityLabel: 'Workout',
          tabBarIcon: tabIcon('sports_basketball'),
        }}
      />
      <TopTabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarAccessibilityLabel: 'Exercises',
          tabBarIcon: tabIcon('format_list_bulleted'),
        }}
      />
      <TopTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: tabIcon('person'),
        }}
      />
    </TopTabs>
  );
}
