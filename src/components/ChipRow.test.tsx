import { render, screen, userEvent } from '@testing-library/react-native';
import { ChipRow } from './ChipRow';

const options = [
  { value: 'all', label: 'All' },
  { value: 'shooting', label: 'Shooting' },
  { value: 'footwork', label: 'Footwork' },
] as const;

test('marks the selected chip and calls onChange with the tapped one', async () => {
  const onChange = jest.fn();
  const user = userEvent.setup();
  await render(<ChipRow options={options} value="shooting" onChange={onChange} />);

  expect(screen.getByRole('radio', { name: 'Shooting' })).toBeSelected();
  expect(screen.getByRole('radio', { name: 'All' })).not.toBeSelected();
  await user.press(screen.getByRole('radio', { name: 'Footwork' }));

  expect(onChange).toHaveBeenCalledWith('footwork');
});

test('a disabled row keeps its selection and ignores taps', async () => {
  const onChange = jest.fn();
  const user = userEvent.setup();
  await render(<ChipRow options={options} value="all" onChange={onChange} disabled />);

  await user.press(screen.getByRole('radio', { name: 'Shooting' }));

  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('radio', { name: 'All' })).toBeSelected();
  expect(screen.getByRole('radio', { name: 'Shooting' })).toBeDisabled();
});
