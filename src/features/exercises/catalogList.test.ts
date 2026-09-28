import { groupByCategory } from './catalogList';

const ex = (name: string, category: 'finishing' | 'dribbling' | 'shooting' | 'footwork') => ({
  name,
  category,
});

describe('groupByCategory', () => {
  test('groups by category in the catalog order and keeps each list in order', () => {
    const sections = groupByCategory([
      ex('Free Throws', 'shooting'),
      ex('Crossover', 'dribbling'),
      ex('Layups', 'finishing'),
      ex('Catch and Shoot', 'shooting'),
    ]);

    expect(sections.map((s) => s.title)).toEqual(['Finishing', 'Dribbling', 'Shooting']);
    expect(sections[2].data.map((e) => e.name)).toEqual(['Free Throws', 'Catch and Shoot']);
  });

  test('leaves out empty categories, and gives nothing for no exercises', () => {
    expect(groupByCategory([ex('Zig Zag', 'footwork')]).map((s) => s.title)).toEqual(['Footwork']);
    expect(groupByCategory([])).toEqual([]);
  });
});
