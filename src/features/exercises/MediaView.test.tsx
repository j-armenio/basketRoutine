import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as expoVideo from 'expo-video';
import { MediaView } from './MediaView';

// The placeholder and the video still are decorative (hidden from accessibility).
const HIDDEN = { includeHiddenElements: true };
const box = { width: 48, height: 48 };

afterEach(() => jest.restoreAllMocks());

test('no media shows the placeholder', async () => {
  await render(<MediaView media={undefined} playing={false} style={box} />);

  expect(screen.getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
});

test('an image shows the file, and a load error switches to the placeholder', async () => {
  await render(
    <MediaView media={{ kind: 'image', source: 'file:///docs/a.jpg' }} playing style={box} />,
  );
  const image = screen.getByTestId('media-image');
  expect(image.props.source).toBe('file:///docs/a.jpg');

  await fireEvent(image, 'error');

  expect(screen.queryByTestId('media-image')).toBeNull();
  expect(screen.getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
});

test('a GIF is still until it plays', async () => {
  const gif = { kind: 'gif', source: 7 } as const;
  const view = await render(<MediaView media={gif} playing={false} style={box} />);
  expect(screen.getByTestId('media-image').props.autoplay).toBe(false);

  await view.rerender(<MediaView media={gif} playing style={box} />);

  expect(screen.getByTestId('media-image').props).toMatchObject({ source: 7, autoplay: true });
});

test('a still video shows its first frame, and a playing one a muted looping player', async () => {
  const video = { kind: 'video', source: 'file:///docs/b.mp4' } as const;
  const view = await render(<MediaView media={video} playing={false} style={box} />);
  await act(async () => {});

  expect(screen.getByTestId('media-video-still', HIDDEN)).toBeOnTheScreen();
  expect(screen.queryByTestId('video-view')).toBeNull();

  await view.rerender(<MediaView media={video} playing controls style={box} />);

  const player = screen.getByTestId('video-view');
  expect(player.props.nativeControls).toBe(true);
  expect(player.props.player).toMatchObject({
    source: 'file:///docs/b.mp4',
    loop: true,
    muted: true,
  });
  expect(player.props.player.play).toHaveBeenCalled();
});

test('a video whose first frame cannot be made shows a paused player instead', async () => {
  jest.spyOn(expoVideo, 'createVideoPlayer').mockReturnValue({
    generateThumbnailsAsync: jest.fn(async () => {
      throw new Error('corrupt');
    }),
    release: jest.fn(),
  } as unknown as ReturnType<typeof expoVideo.createVideoPlayer>);

  await render(
    <MediaView
      media={{ kind: 'video', source: 'file:///docs/broken.mp4' }}
      playing={false}
      style={box}
    />,
  );
  await act(async () => {});

  const player = screen.getByTestId('video-view').props.player;
  expect(player.source).toBe('file:///docs/broken.mp4');
  expect(player.play).not.toHaveBeenCalled();
  expect(screen.queryByTestId('media-placeholder', HIDDEN)).toBeNull();
});
