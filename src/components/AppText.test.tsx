import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { render, screen } from '@testing-library/react-native';
import { AppText } from './AppText';

test('uses the body variant and default tone unless told otherwise', async () => {
  await render(<AppText>Hello</AppText>);

  expect(screen.getByText('Hello')).toHaveStyle({ fontSize: 16, color: colors.textPrimary });
});

test('applies the variant and tone', async () => {
  await render(
    <AppText variant="title" tone="error">
      Oops
    </AppText>,
  );

  expect(screen.getByText('Oops')).toHaveStyle({ fontSize: 26, color: colors.error });
});

test('has a success tone', async () => {
  await render(<AppText tone="success">Nice</AppText>);

  expect(screen.getByText('Nice')).toHaveStyle({ color: colors.success });
});

test('uses the Plus Jakarta Sans family of the variant, or of the weight given', async () => {
  await render(
    <>
      <AppText>Regular</AppText>
      <AppText variant="display">Title</AppText>
      <AppText weight="bold">Bold</AppText>
    </>,
  );

  expect(screen.getByText('Regular')).toHaveStyle({ fontFamily: fonts.regular });
  expect(screen.getByText('Title')).toHaveStyle({ fontFamily: fonts.extraBold });
  expect(screen.getByText('Bold')).toHaveStyle({ fontFamily: fonts.bold });
});
