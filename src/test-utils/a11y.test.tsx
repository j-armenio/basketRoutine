import { Button } from '@/components/Button';
import { ChipRow } from '@/components/ChipRow';
import { IconButton } from '@/components/IconButton';
import { ListItem } from '@/components/ListItem';
import { NumberInput } from '@/components/NumberInput';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { render } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { expectAccessibleControls } from './a11y';

const noop = () => {};

test('fails on a Pressable with no name', async () => {
  await render(
    <View>
      <Pressable accessibilityRole="button" onPress={noop} testID="nameless" />
    </View>,
  );

  expect(() => expectAccessibleControls()).toThrow(/no name.*nameless/s);
});

test('fails on a Pressable with no role', async () => {
  await render(
    <Pressable onPress={noop}>
      <Text>Open</Text>
    </Pressable>,
  );

  expect(() => expectAccessibleControls()).toThrow(/no role.*Open/s);
});

test('a text child or a label names a control', async () => {
  await render(
    <View>
      <Pressable accessibilityRole="button" onPress={noop}>
        <View>
          <Text>Start</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={noop} />
    </View>,
  );

  expect(() => expectAccessibleControls()).not.toThrow();
});

test('passes on the base components, a set row with its tap layer included', async () => {
  await render(
    <View>
      <Button label="Save" onPress={noop} />
      <IconButton icon="close" accessibilityLabel="Close" onPress={noop} />
      <ListItem title="Free Throws" onPress={noop} />
      <ChipRow
        options={[
          { value: 'a', label: 'All' },
          { value: 'b', label: 'Custom' },
        ]}
        value="a"
        onChange={noop}
      />
      <SwipeToDelete deleteLabel="Delete set 1" onDelete={() => true}>
        <NumberInput accessibilityLabel="Set 1 makes" value="7" />
      </SwipeToDelete>
    </View>,
  );

  expect(() => expectAccessibleControls()).not.toThrow();
});

test('a control hidden from accessibility is left out', async () => {
  await render(
    <View importantForAccessibility="no-hide-descendants">
      <Pressable onPress={noop} />
    </View>,
  );

  expect(() => expectAccessibleControls()).not.toThrow();
});

test('fails on a number field with no label', async () => {
  // @ts-expect-error: the prop is required, left out on purpose
  await render(<NumberInput value="7" />);

  expect(() => expectAccessibleControls()).toThrow(/no name/);
});
