import { closeDraft, getDraft, isDraftDirty, openDraft, updateDraft, useDraft } from './draftStore';
import { act, renderHook } from '@testing-library/react-native';
import { emptyDraft, rename } from './templateDraft';

afterEach(closeDraft);

test('opens a draft, updates it and closes it', () => {
  expect(getDraft()).toBeNull();
  openDraft(emptyDraft(1));
  expect(getDraft()).toEqual(emptyDraft(1));

  updateDraft((draft) => rename(draft, 'Push'));
  expect(getDraft()?.name).toBe('Push');

  closeDraft();
  expect(getDraft()).toBeNull();
});

test('updateDraft with no open draft does nothing', () => {
  const change = jest.fn((draft) => draft);
  expect(() => updateDraft(change)).not.toThrow();
  expect(change).not.toHaveBeenCalled();
  expect(getDraft()).toBeNull();
});

test('tracks whether the draft differs from where it started', () => {
  expect(isDraftDirty()).toBe(false);
  openDraft(emptyDraft(1));
  expect(isDraftDirty()).toBe(false);
  updateDraft((draft) => rename(draft, 'Push'));
  expect(isDraftDirty()).toBe(true);
  updateDraft((draft) => rename(draft, ''));
  expect(isDraftDirty()).toBe(false);
});

test('the hook follows updates and closing', async () => {
  openDraft(emptyDraft(1));
  const view = await renderHook(() => useDraft());
  expect(view.result.current?.name).toBe('');

  await act(async () => updateDraft((draft) => rename(draft, 'Push')));
  expect(view.result.current?.name).toBe('Push');

  await act(async () => closeDraft());
  expect(view.result.current).toBeNull();
});
