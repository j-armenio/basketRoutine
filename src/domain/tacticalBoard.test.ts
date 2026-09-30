import {
  arrowControlPoint,
  arrowHead,
  arrowMidpoint,
  describeBoard,
  distanceM,
  distanceToElementM,
  emptyBoard,
  eraseAt,
  hitElement,
  isArrowLongEnough,
  MAX_BOARD_ELEMENTS,
  MAX_STROKE_POINTS,
  normalizePoint,
  sameBoard,
  sameElement,
  sameElements,
  simplifyStroke,
  smoothPath,
  translateElement,
  TOUCH_TOLERANCE_M,
  validateBoard,
  type ArrowElement,
  type BoardElement,
  type BoardPoint,
  type TacticalBoard,
} from './tacticalBoard';

const board = (elements: TacticalBoard['elements']): TacticalBoard => ({ version: 1, elements });

describe('validateBoard', () => {
  test('accepts every element type, including a curved arrow', () => {
    expect(
      validateBoard(
        board([
          { type: 'x', at: [0, 1] },
          { type: 'arrow', from: [0.2, 0.3], to: [0.5, 0.5] },
          { type: 'arrow', from: [0.2, 0.3], to: [0.5, 0.5], via: [0.4, 0.2] },
          {
            type: 'pen',
            points: [
              [0.1, 0.1],
              [0.2, 0.2],
            ],
          },
        ]),
      ),
    ).toEqual({ ok: true });
  });

  test.each([
    ['not an object', 'board'],
    ['null', null],
    ['another version', { version: 2, elements: [] }],
    ['no elements', { version: 1 }],
    ['an empty board', emptyBoard()],
    ['an unknown element', { version: 1, elements: [{ type: 'circle', at: [0, 0] }] }],
    ['a point off the court', board([{ type: 'x', at: [1.2, 0.5] }])],
    ['a point that is not a pair', { version: 1, elements: [{ type: 'x', at: [0.5] }] }],
    ['a point that is not finite', board([{ type: 'x', at: [NaN, 0.5] }])],
    ['a stroke of one point', board([{ type: 'pen', points: [[0.1, 0.1]] }])],
    [
      'an arrow with an off-court via point',
      board([{ type: 'arrow', from: [0.1, 0.1], to: [0.5, 0.5], via: [1.5, 0.2] }]),
    ],
  ])('refuses %s', (_, value) => {
    expect(validateBoard(value)).toEqual({ ok: false, reason: 'invalid_board' });
  });

  test('refuses too many elements, or a stroke with too many points', () => {
    const x = { type: 'x' as const, at: [0.5, 0.5] as BoardPoint };
    expect(validateBoard(board(Array(MAX_BOARD_ELEMENTS).fill(x))).ok).toBe(true);
    expect(validateBoard(board(Array(MAX_BOARD_ELEMENTS + 1).fill(x))).ok).toBe(false);
    const points = (n: number) => Array.from({ length: n }, (): BoardPoint => [0.5, 0.5]);
    expect(validateBoard(board([{ type: 'pen', points: points(MAX_STROKE_POINTS) }])).ok).toBe(
      true,
    );
    expect(validateBoard(board([{ type: 'pen', points: points(MAX_STROKE_POINTS + 1) }])).ok).toBe(
      false,
    );
  });
});

describe('normalizePoint', () => {
  test('keeps the point on the court, rounded to 4 decimals', () => {
    expect(normalizePoint([0.123456, 0.5])).toEqual([0.1235, 0.5]);
    expect(normalizePoint([-0.2, 1.3])).toEqual([0, 1]);
  });
});

describe('arrows', () => {
  test('distances are in meters over a 15 x 14 m court', () => {
    expect(distanceM([0, 0], [1, 0])).toBeCloseTo(15);
    expect(distanceM([0, 0], [0, 1])).toBeCloseTo(14);
  });

  test('an arrow under half a meter is a slip', () => {
    expect(isArrowLongEnough([0.5, 0.5], [0.52, 0.5])).toBe(false); // 30 cm
    expect(isArrowLongEnough([0.5, 0.5], [0.54, 0.5])).toBe(true); // 60 cm
  });

  test('the head points back from the tip, one end on each side', () => {
    const [left, right] = arrowHead([0, 0], [10, 0], 1);
    expect(left[0]).toBeCloseTo(10 - Math.cos((28 * Math.PI) / 180));
    expect(right[0]).toBeCloseTo(left[0]);
    expect(left[1]).toBeCloseTo(-right[1]);
    expect(Math.hypot(10 - left[0], left[1])).toBeCloseTo(1);
  });
});

describe('a curved arrow', () => {
  // BoardPoint is normalized (0..1): the arrow used here reads that way, unlike arrowControlPoint
  // and arrowHead below, which are unit-agnostic and are exercised in meters instead.
  const from: BoardPoint = [0.1, 0.5];
  const to: BoardPoint = [0.9, 0.5];

  test('the handle sits at `via`, or at the straight middle without one', () => {
    expect(arrowMidpoint({ from, to })).toEqual([0.5, 0.5]);
    expect(arrowMidpoint({ from, to, via: [0.5, 0.8] })).toEqual([0.5, 0.8]);
  });

  test('the control point makes the curve pass through `via` at its middle', () => {
    const [fromM, toM] = [
      [0, 0],
      [10, 0],
    ] as [BoardPoint, BoardPoint];
    const via: BoardPoint = [5, 3];
    const control = arrowControlPoint(fromM, toM, via);
    // the quadratic bezier at t=0.5 is the average of `control` and the straight middle
    const straightMiddle: BoardPoint = [5, 0];
    expect([(control[0] + straightMiddle[0]) / 2, (control[1] + straightMiddle[1]) / 2]).toEqual(
      via,
    );
  });

  test('a straight arrow is a degenerate curve: distance is to the segment', () => {
    const arrow: ArrowElement = { type: 'arrow', from: [0, 0.5], to: [1, 0.5] };
    expect(distanceToElementM(arrow, [0.5, 0.5])).toBeCloseTo(0);
    expect(distanceToElementM(arrow, [0.5, 0.6])).toBeGreaterThan(0);
  });

  test('a curved arrow is close to its handle, not to the straight middle', () => {
    const arrow: ArrowElement = { type: 'arrow', from: [0, 0.5], to: [1, 0.5], via: [0.5, 0.8] };
    expect(distanceToElementM(arrow, [0.5, 0.8])).toBeLessThan(0.2);
    expect(distanceToElementM(arrow, [0.5, 0.5])).toBeGreaterThan(1);
  });
});

describe('hitElement and eraseAt', () => {
  const x: BoardElement = { type: 'x', at: [0.2, 0.2] };
  const pen: BoardElement = {
    type: 'pen',
    points: [
      [0.6, 0.6],
      [0.8, 0.6],
    ],
  };
  const elements = [x, pen];

  test('hitElement finds the topmost element within tolerance, or none', () => {
    expect(hitElement(elements, [0.2, 0.2], TOUCH_TOLERANCE_M)).toBe(0);
    expect(hitElement(elements, [0.7, 0.6], TOUCH_TOLERANCE_M)).toBe(1);
    expect(hitElement(elements, [0.99, 0.99], TOUCH_TOLERANCE_M)).toBeUndefined();
  });

  test('a later element on top wins over an earlier one at the same spot', () => {
    const onTop: BoardElement = { type: 'x', at: [0.2, 0.2] };
    expect(hitElement([x, onTop], [0.2, 0.2], TOUCH_TOLERANCE_M)).toBe(1);
  });

  test('eraseAt removes every element touched, and nothing when none is', () => {
    expect(eraseAt(elements, [0.2, 0.2], TOUCH_TOLERANCE_M)).toEqual([pen]);
    expect(eraseAt(elements, [0.99, 0.99], TOUCH_TOLERANCE_M)).toEqual(elements);
    const overlapping: BoardElement = { type: 'x', at: [0.2, 0.2] };
    expect(eraseAt([x, overlapping, pen], [0.2, 0.2], TOUCH_TOLERANCE_M)).toEqual([pen]);
  });
});

describe('translateElement', () => {
  test('shifts every point of an element by the same amount', () => {
    const x: BoardElement = { type: 'x', at: [0.3, 0.3] };
    expect(translateElement(x, 0.1, -0.1)).toEqual({ type: 'x', at: [0.4, 0.2] });

    const arrow: ArrowElement = {
      type: 'arrow',
      from: [0.2, 0.2],
      to: [0.4, 0.2],
      via: [0.3, 0.3],
    };
    expect(translateElement(arrow, 0.1, 0.1)).toEqual({
      type: 'arrow',
      from: [0.3, 0.3],
      to: [0.5, 0.3],
      via: [0.4, 0.4],
    });

    const pen: BoardElement = {
      type: 'pen',
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
      ],
    };
    expect(translateElement(pen, 0.1, 0)).toEqual({
      type: 'pen',
      points: [
        [0.2, 0.1],
        [0.3, 0.2],
      ],
    });
  });

  test('clamps so the whole element stays on the court', () => {
    const x: BoardElement = { type: 'x', at: [0.05, 0.95] };
    expect(translateElement(x, -1, 1)).toEqual({ type: 'x', at: [0, 1] });

    const pen: BoardElement = {
      type: 'pen',
      points: [
        [0.1, 0.5],
        [0.9, 0.5],
      ],
    };
    // shifting right by more than the room the rightmost point (0.9) has left is clamped
    expect(translateElement(pen, 0.5, 0)).toEqual({
      type: 'pen',
      points: [
        [0.2, 0.5],
        [1, 0.5],
      ],
    });
  });
});

describe('sameElement and sameElements', () => {
  test('an arrow with a curve differs from the same one straight', () => {
    const straight: ArrowElement = { type: 'arrow', from: [0.1, 0.1], to: [0.5, 0.5] };
    const curved: ArrowElement = { ...straight, via: [0.4, 0.1] };
    expect(sameElement(straight, curved)).toBe(false);
    expect(sameElement(curved, { ...curved })).toBe(true);
  });

  test('sameElements compares two lists element by element', () => {
    const a: BoardElement[] = [{ type: 'x', at: [0.1, 0.1] }];
    expect(sameElements(a, structuredClone(a))).toBe(true);
    expect(sameElements(a, [])).toBe(false);
    expect(sameElements([], [])).toBe(true);
  });
});

describe('simplifyStroke', () => {
  test('a straight line keeps only its ends', () => {
    const line = Array.from({ length: 50 }, (_, i): BoardPoint => [i / 100, 0.5]);
    expect(simplifyStroke(line)).toEqual([
      [0, 0.5],
      [0.49, 0.5],
    ]);
  });

  test('keeps the corner of an L, and the points come back normalized', () => {
    const down = Array.from({ length: 20 }, (_, i): BoardPoint => [0.2, 0.2 + i / 50]);
    const across = Array.from({ length: 20 }, (_, i): BoardPoint => [0.2 + (i + 1) / 50, 0.58]);
    const simplified = simplifyStroke([...down, ...across]);
    expect(simplified).toEqual([
      [0.2, 0.2],
      [0.2, 0.58],
      [0.6, 0.58],
    ]);
  });

  test('a curve keeps enough points to stay within 5 cm of the drawn line', () => {
    const arc = Array.from({ length: 200 }, (_, i): BoardPoint => {
      const t = (i / 199) * Math.PI;
      return [0.5 + 0.3 * Math.cos(t), 0.2 + 0.3 * Math.sin(t)];
    });
    const simplified = simplifyStroke(arc);
    expect(simplified.length).toBeLessThan(arc.length / 4);
    expect(simplified.length).toBeGreaterThan(5);
    expect(simplified[0]).toEqual(normalizePoint(arc[0]));
    expect(simplified.at(-1)).toEqual(normalizePoint(arc.at(-1)!));
  });

  test('one or two points stay as they are', () => {
    expect(simplifyStroke([[0.1, 0.1]])).toEqual([[0.1, 0.1]]);
    expect(
      simplifyStroke([
        [0.1, 0.1],
        [0.1, 0.1],
      ]),
    ).toEqual([
      [0.1, 0.1],
      [0.1, 0.1],
    ]);
  });
});

describe('smoothPath', () => {
  test('curves through the middles of the segments', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([[1, 2]])).toBe('M1 2');
    expect(
      smoothPath([
        [0, 0],
        [2, 2],
      ]),
    ).toBe('M0 0 L2 2');
    expect(
      smoothPath([
        [0, 0],
        [2, 0],
        [2, 2],
      ]),
    ).toBe('M0 0 Q2 0 2 1 L2 2');
  });
});

describe('sameBoard', () => {
  const a = board([
    { type: 'x', at: [0.1, 0.2] },
    {
      type: 'pen',
      points: [
        [0.1, 0.1],
        [0.3, 0.3],
      ],
    },
  ]);

  test('matches an equal copy, and no board with no board', () => {
    expect(sameBoard(a, structuredClone(a))).toBe(true);
    expect(sameBoard(null, null)).toBe(true);
  });

  test('no board and an empty board differ', () => {
    expect(sameBoard(null, emptyBoard())).toBe(false);
    expect(sameBoard(emptyBoard(), null)).toBe(false);
  });

  test('a moved, added, removed or reordered element differs', () => {
    const moved = structuredClone(a);
    moved.elements[0] = { type: 'x', at: [0.1, 0.3] };
    expect(sameBoard(a, moved)).toBe(false);
    expect(sameBoard(a, board(a.elements.slice(0, 1)))).toBe(false);
    expect(sameBoard(a, board([a.elements[1], a.elements[0]]))).toBe(false);
    const arrow = board([{ type: 'arrow', from: [0.1, 0.2], to: [0.1, 0.2] }]);
    expect(sameBoard(board(a.elements.slice(0, 1)), arrow)).toBe(false);
  });
});

describe('describeBoard', () => {
  test('counts each kind, in the singular or the plural', () => {
    expect(describeBoard(emptyBoard())).toBe('Empty tactical board');
    expect(
      describeBoard(
        board([
          { type: 'x', at: [0.1, 0.1] },
          { type: 'x', at: [0.2, 0.1] },
          { type: 'arrow', from: [0.1, 0.1], to: [0.5, 0.5] },
          {
            type: 'pen',
            points: [
              [0.1, 0.1],
              [0.2, 0.2],
            ],
          },
        ]),
      ),
    ).toBe('Tactical board: 2 X marks, 1 arrow, 1 line');
  });
});
