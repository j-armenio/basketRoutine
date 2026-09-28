// The swipe itself can't run in Jest (it's a Reanimated gesture on the UI thread), so the row
// renders as a plain view. Tests delete through SwipeToDelete's accessibility action instead,
// and the gesture is checked on the phone. The view keeps `onSwipeableOpen`, so a test can fire
// the end of a swipe (`swipeableOpen`) on it.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const { View } = require('react-native');
  const Swipeable = ({ children, testID, onSwipeableOpen }) => (
    <View testID={testID} onSwipeableOpen={onSwipeableOpen}>
      {children}
    </View>
  );
  return { __esModule: true, default: Swipeable };
});

// The media modules have no native side in Jest. The file system is an in-memory set of file URIs
// (`__files`), so tests can check what was copied into the app's storage and what was deleted.
jest.mock('expo-file-system', () => {
  const files = new Set();
  const join = (parts) =>
    parts
      .map((part) => (typeof part === 'string' ? part : part.uri))
      .map((uri, i) => (i === 0 ? uri.replace(/\/+$/, '') : uri.replace(/^\/+|\/+$/g, '')))
      .join('/');
  class File {
    constructor(...parts) {
      this.uri = join(parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    copySync(target) {
      files.add(target.uri);
    }
    delete() {
      files.delete(this.uri);
    }
  }
  class Directory {
    constructor(...parts) {
      this.uri = `${join(parts)}/`;
    }
    create() {}
  }
  const Paths = { document: new Directory('file:///docs'), cache: new Directory('file:///cache') };
  return { __esModule: true, File, Directory, Paths, __files: files };
});

jest.mock('expo-image-picker', () => ({
  __esModule: true,
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

// Renders the props that matter (`source`, `autoplay`) on a plain view.
jest.mock('expo-image', () => {
  const { forwardRef, useImperativeHandle } = require('react');
  const { View } = require('react-native');
  const Image = forwardRef(function Image(props, ref) {
    useImperativeHandle(ref, () => ({
      startAnimating: async () => {},
      stopAnimating: async () => {},
    }));
    return <View {...props} />;
  });
  return { __esModule: true, Image };
});

jest.mock('expo-video', () => {
  const { View } = require('react-native');
  const makePlayer = (source) => ({
    source,
    loop: false,
    muted: false,
    play: jest.fn(),
    pause: jest.fn(),
    release: jest.fn(),
    generateThumbnailsAsync: jest.fn(async () => [{ width: 1, height: 1, thumbnailOf: source }]),
  });
  return {
    __esModule: true,
    createVideoPlayer: (source) => makePlayer(source),
    // One player per source, like the real hook.
    useVideoPlayer: (source, setup) =>
      require('react').useMemo(() => {
        const player = makePlayer(source);
        setup?.(player);
        return player;
      }, [source]),
    VideoView: (props) => <View testID="video-view" {...props} />,
  };
});

// No vibrator in Jest: every function resolves, so tests can assert the calls and their constants.
jest.mock('expo-haptics', () => {
  const actual = jest.requireActual('expo-haptics/src/Haptics.types');
  return {
    __esModule: true,
    ...actual,
    performAndroidHapticsAsync: jest.fn(async () => {}),
    notificationAsync: jest.fn(async () => {}),
    impactAsync: jest.fn(async () => {}),
    selectionAsync: jest.fn(async () => {}),
  };
});
