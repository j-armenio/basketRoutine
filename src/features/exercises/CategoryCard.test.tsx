import { render, screen, userEvent } from '@testing-library/react-native';
import { CategoryCard, CategoryGrid } from './CategoryCard';
import { CATEGORY_IMAGES } from './categoryImages';

const HIDDEN = { includeHiddenElements: true };
const shooting = { key: 'shooting' as const, label: 'Shooting', count: 10 };

test('with an image: the image covers the card, and it reads as one button', async () => {
  CATEGORY_IMAGES.shooting = { file: 'shooting.jpg', source: 42 };
  try {
    const onPress = jest.fn();
    await render(<CategoryCard card={shooting} onPress={onPress} />);

    expect(screen.getByTestId('category-image').props).toMatchObject({
      source: 42,
      contentFit: 'cover',
    });
    expect(screen.queryByTestId('category-placeholder', HIDDEN)).toBeNull();
    await userEvent.press(screen.getByRole('button', { name: 'Shooting, 10 exercises' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  } finally {
    delete CATEGORY_IMAGES.shooting;
  }
});

test('without an image: the placeholder', async () => {
  await render(<CategoryCard card={{ ...shooting, count: 1 }} onPress={() => {}} />);

  expect(screen.getByTestId('category-placeholder', HIDDEN)).toBeOnTheScreen();
  expect(screen.queryByTestId('category-image')).toBeNull();
  expect(screen.getByRole('button', { name: 'Shooting, 1 exercise' })).toBeOnTheScreen();
});

test('the grid lays the cards two per row and hands back the pressed one', async () => {
  const onPressCard = jest.fn();
  const cards = [
    { key: 'finishing' as const, label: 'Finishing', count: 9 },
    shooting,
    { key: 'custom' as const, label: 'Custom', count: 0 },
  ];
  await render(<CategoryGrid cards={cards} onPressCard={onPressCard} />);

  expect(screen.getAllByRole('button')).toHaveLength(3);
  await userEvent.press(screen.getByRole('button', { name: 'Custom, 0 exercises' }));
  expect(onPressCard).toHaveBeenCalledWith(cards[2]);
});
