import { isHiddenFromAccessibility, screen } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';

/**
 * A control: something a screen reader focuses or a finger presses or types in. `Pressable`
 * doesn't pass `onPress` down to its host view, only its responder handlers (`onClick`,
 * `onResponderRelease`), so those are what is looked for, next to `accessible`.
 */
function isControl(node: TestInstance): boolean {
  const { props } = node;
  if (isScrollView(node)) return props.accessible === true;
  return (
    isTextInput(node) ||
    props.accessible === true ||
    typeof props.onClick === 'function' ||
    typeof props.onResponderRelease === 'function'
  );
}

// A scroll view has responder handlers of its own (for the scroll), not a press.
const isScrollView = (node: TestInstance) => /ScrollView/.test(node.type);

// A text field's role is implicit (Android's EditText); it still needs a name.
const isTextInput = (node: TestInstance) => /TextInput/.test(node.type);

/**
 * Known exceptions, left out of the check:
 * - the transparent layer `NumberInput` lays over its field until it is focused (so a
 *   `SwipeToDelete` drag can start on it): screen readers reach the field under it, which
 *   carries the name.
 * Elements hidden from accessibility (the media placeholder, the video still, unfocused
 * screens) are left out as well.
 */
function isKnownException(node: TestInstance): boolean {
  return typeof node.props.testID === 'string' && node.props.testID.endsWith(' tap area');
}

function role(node: TestInstance): string | undefined {
  const value = node.props.accessibilityRole ?? node.props.role;
  return value && value !== 'none' ? value : undefined;
}

/** The text a screen reader would read from the element's children, all levels down. */
function textContent(node: TestInstance | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textContent).join('');
}

function name(node: TestInstance): string {
  const label = node.props.accessibilityLabel ?? node.props['aria-label'];
  return (typeof label === 'string' ? label : textContent(node)).trim();
}

function describe(node: TestInstance): string {
  const { testID } = node.props;
  const text = textContent(node).trim();
  return [node.type, testID && `testID "${testID}"`, text && `text "${text}"`]
    .filter(Boolean)
    .join(', ');
}

/**
 * Fails when a control on screen has no role or no name (an accessibility label or a text
 * child), so TalkBack would announce it as nothing, or as a bare "double-tap to activate".
 * Called on every screen the flow tests visit.
 */
export function expectAccessibleControls(root: TestInstance = screen.container): void {
  const cache = new WeakMap<TestInstance, boolean>();
  const problems = root
    .queryAll(isControl, { includeSelf: true })
    .filter((node) => !isKnownException(node) && !isHiddenFromAccessibility(node, { cache }))
    .flatMap((node) => [
      ...(role(node) || isTextInput(node) ? [] : [`no role: ${describe(node)}`]),
      ...(name(node) ? [] : [`no name: ${describe(node)}`]),
    ]);
  if (problems.length > 0) {
    throw new Error(`Controls a screen reader can't announce:\n${problems.join('\n')}`);
  }
}
