import {
  sameStructure,
  structureFromSession,
  structureFromTemplate,
  type TemplateStructure,
} from './template';
import type { TacticalBoard } from './tacticalBoard';

const base: TemplateStructure = [
  { exerciseId: 1, targetMode: 'attempts', targetValues: [10, 10], tacticalBoard: null },
  {
    exerciseId: 2,
    targetMode: null,
    targetValues: [null],
    tacticalBoard: { version: 1, elements: [{ type: 'x', at: [0.5, 0.5] }] },
  },
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

  test('an added, changed or removed tactical board differs', () => {
    const added = copy();
    added[0].tacticalBoard = { version: 1, elements: [] };
    expect(sameStructure(base, added)).toBe(false);

    const changed = copy();
    changed[1].tacticalBoard = { version: 1, elements: [{ type: 'x', at: [0.5, 0.6] }] };
    expect(sameStructure(base, changed)).toBe(false);

    const removed = copy();
    removed[1].tacticalBoard = null;
    expect(sameStructure(base, removed)).toBe(false);
  });
});

describe('structure builders', () => {
  const board: TacticalBoard = { version: 1, elements: [] };
  const exercises = [
    {
      exerciseId: 1,
      targetMode: 'attempts' as const,
      sets: [{ targetValue: 10 }],
      tacticalBoard: board,
    },
    {
      exerciseId: 2,
      targetMode: null,
      sets: [{ targetValue: null }, { targetValue: null }],
      tacticalBoard: null,
    },
  ];

  test('read the exercises in order with their targets and boards', () => {
    const expected = [
      { exerciseId: 1, targetMode: 'attempts', targetValues: [10], tacticalBoard: board },
      { exerciseId: 2, targetMode: null, targetValues: [null, null], tacticalBoard: null },
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
          tacticalBoard: null,
        },
      ],
    };
    const untouched = {
      exercises: [
        {
          exerciseId: 1,
          targetMode: 'attempts' as const,
          sets: [{ targetValue: 10 }],
          tacticalBoard: null,
        },
      ],
    };
    expect(sameStructure(structureFromSession(session), structureFromTemplate(untouched))).toBe(
      true,
    );
  });
});
