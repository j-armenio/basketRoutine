import { displayName, initialOf, workoutsLogged } from './profileText';

describe('displayName', () => {
  test('is the name, or "Player" when it is blank', () => {
    expect(displayName('João')).toBe('João');
    expect(displayName('')).toBe('Player');
    expect(displayName('   ')).toBe('Player');
  });
});

describe('initialOf', () => {
  test("is the name's first letter in capitals, or undefined with no name", () => {
    expect(initialOf('joão')).toBe('J');
    expect(initialOf('  élise ')).toBe('É');
    expect(initialOf('')).toBeUndefined();
    expect(initialOf('  ')).toBeUndefined();
  });

  test('keeps a character made of two code units whole', () => {
    expect(initialOf('🏀 Hoops')).toBe('🏀');
  });
});

describe('workoutsLogged', () => {
  test('says none, one or many', () => {
    expect(workoutsLogged(0)).toBe('No workouts logged yet');
    expect(workoutsLogged(1)).toBe('1 workout logged');
    expect(workoutsLogged(8)).toBe('8 workouts logged');
  });
});
