import {
  sameStructure,
  structureFromSession,
  structureFromTemplate,
  type TemplateStructure,
} from './template';

const base: TemplateStructure = [
  { exerciseId: 1, targetMode: 'attempts', targetValues: [10, 10] },
  { exerciseId: 2, targetMode: null, targetValues: [null] },
];
const copy = (): TemplateStructure => structuredClone(base);

describe('sameStructure', () => {
  test('identical structures match, and so do two empty ones', () => {
    expect(sameStructure(base, copy())).toBe(true);
    expect(sameStructure([], [])).toBe(true);
  });

  test('a changed target, added or removed set differ', () => {
    const changed = copy();
    changed[0].targetValues[1] = 12;
    expect(sameStructure(base, changed)).toBe(false);

    const added = copy();
    added[0].targetValues.push(10);
    expect(sameStructure(base, added)).toBe(false);

    const removed = copy();
    removed[0].targetValues.pop();
    expect(sameStructure(base, removed)).toBe(false);
  });

  test('a removed, added or reordered exercise differ', () => {
    expect(sameStructure(base, base.slice(0, 1))).toBe(false);
    expect(sameStructure(base.slice(0, 1), base)).toBe(false);
    expect(sameStructure(base, [base[1], base[0]])).toBe(false);
  });

  test('a changed mode or exercise differ', () => {
    const mode = copy();
    mode[0].targetMode = 'makes';
    expect(sameStructure(base, mode)).toBe(false);

    const exercise = copy();
    exercise[0].exerciseId = 3;
    expect(sameStructure(base, exercise)).toBe(false);
  });
});

describe('structure builders', () => {
  const exercises = [
    { exerciseId: 1, targetMode: 'attempts' as const, sets: [{ targetValue: 10 }] },
    { exerciseId: 2, targetMode: null, sets: [{ targetValue: null }, { targetValue: null }] },
  ];

  test('read the exercises in order with their targets', () => {
    const expected = [
      { exerciseId: 1, targetMode: 'attempts', targetValues: [10] },
      { exerciseId: 2, targetMode: null, targetValues: [null, null] },
    ];
    expect(structureFromTemplate({ exercises })).toEqual(expected);
    expect(structureFromSession({ exercises })).toEqual(expected);
  });

  test('a session ignores logged values, ✓ and notes', () => {
    const session = {
      exercises: [
        {
          exerciseId: 1,
          targetMode: 'attempts' as const,
          note: 'felt good',
          sets: [{ targetValue: 10, loggedValue: 7, completed: true }],
        },
      ],
    };
    const untouched = {
      exercises: [
        {
          exerciseId: 1,
          targetMode: 'attempts' as const,
          sets: [{ targetValue: 10 }],
        },
      ],
    };
    expect(sameStructure(structureFromSession(session), structureFromTemplate(untouched))).toBe(
      true,
    );
  });
});
