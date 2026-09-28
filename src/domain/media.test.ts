import { extensionOf, mediaKind, pickedMedia } from './media';

describe('mediaKind', () => {
  test.each([
    ['file:///data/exercise-media/1.jpg', 'image'],
    ['file:///a/b.JPEG', 'image'],
    ['file:///a/b.png?x=1', 'image'],
    ['file:///a/b.webp#top', 'image'],
    ['file:///a/b.gif', 'gif'],
    ['file:///a/b.GIF', 'gif'],
    ['file:///a/b.mp4', 'video'],
    ['file:///a/b.mov', 'video'],
    ['file:///a/b.webm', 'video'],
    ['file:///a/b.3gp', 'video'],
  ])('%s is %s', (uri, kind) => {
    expect(mediaKind(uri)).toBe(kind);
  });

  test.each(['file:///a/b', 'file:///a/b.pdf', 'file:///a.gif/b', 'file:///a/.gif', ''])(
    '%j is not supported',
    (uri) => {
      expect(mediaKind(uri)).toBeUndefined();
    },
  );
});

test('extensionOf reads the last path segment only', () => {
  expect(extensionOf('file:///a.b/c.MP4?t=1')).toBe('mp4');
  expect(extensionOf('clip.mov')).toBe('mov');
  expect(extensionOf('file:///a.b/c')).toBeUndefined();
});

describe('pickedMedia', () => {
  const uri = 'file:///cache/ImagePicker/abc';

  test('takes the extension from the MIME type first', () => {
    expect(pickedMedia({ uri, mimeType: 'image/gif', fileName: 'x.png' })).toEqual({
      ok: true,
      media: { uri, extension: 'gif', kind: 'gif' },
    });
    expect(pickedMedia({ uri, mimeType: 'video/quicktime', duration: 5000 })).toEqual({
      ok: true,
      media: { uri, extension: 'mov', kind: 'video' },
    });
  });

  test('falls back to the file name, then the URI', () => {
    expect(pickedMedia({ uri, mimeType: null, fileName: 'drill.JPG' })).toMatchObject({
      ok: true,
      media: { extension: 'jpg', kind: 'image' },
    });
    expect(pickedMedia({ uri: 'file:///cache/drill.webp' })).toMatchObject({
      ok: true,
      media: { extension: 'webp', kind: 'image' },
    });
  });

  test('a video up to 30 s is taken, a longer one is refused', () => {
    expect(pickedMedia({ uri, mimeType: 'video/mp4', duration: 30_000 }).ok).toBe(true);
    expect(pickedMedia({ uri, mimeType: 'video/mp4', duration: 30_001 })).toEqual({
      ok: false,
      reason: 'too_long',
    });
  });

  test('an unsupported or unknown type is refused', () => {
    expect(pickedMedia({ uri, mimeType: 'image/heic', fileName: 'x.heic' })).toEqual({
      ok: false,
      reason: 'unsupported',
    });
    expect(pickedMedia({ uri })).toEqual({ ok: false, reason: 'unsupported' });
  });
});
