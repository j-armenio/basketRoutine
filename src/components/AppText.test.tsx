import { colors } from '@/theme/colors';
import { render, screen } from '@testing-library/react-native';
import { AppText } from './AppText';

test('uses the body variant and default tone unless told otherwise', async () => {
  await render(<AppText>Hello</AppText>);

  expect(screen.getByText('Hello')).toHaveStyle({ fontSize: 16, color: colors.text });
});

test('applies the variant and tone', async () => {
  await render(
    <AppText variant="title" tone="danger">
      Oops
    </AppText>,
  );

  expect(screen.getByText('Oops')).toHaveStyle({ fontSize: 28, color: colors.danger });
});
