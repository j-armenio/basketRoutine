// The swipe itself can't run in Jest (it's a Reanimated gesture on the UI thread), so the row
// renders as a plain view. Tests delete through SwipeToDelete's accessibility action instead,
// and the gesture is checked on the phone.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const { View } = require('react-native');
  const Swipeable = ({ children, testID }) => <View testID={testID}>{children}</View>;
  return { __esModule: true, default: Swipeable };
});
