import { FG_GOOD_PCT, FG_POOR_PCT, fgBand, fgRatio, setFgPct, setMakesAttempts } from './fg';

describe('setMakesAttempts', () => {
  test('makes mode: target is makes, logged is attempts', () => {
    expect(setMakesAttempts({ targetMode: 'makes', targetValue: 5, loggedValue: 8 })).toEqual({
      makes: 5,
      attempts: 8,
    });
  });
  test('attempts mode: target is attempts, logged is makes', () => {
    expect(
      setMakesAttempts({
        targetMode: 'attempts',
        targetValue: 10,
        loggedValue: 7,
      }),
    ).toEqual({ makes: 7, attempts: 10 });
  });
  test('null when nothing is logged, but 0 counts as logged', () => {
    expect(
      setMakesAttempts({
        targetMode: 'attempts',
        targetValue: 10,
        loggedValue: null,
      }),
    ).toBeNull();
    expect(
      setMakesAttempts({
        targetMode: 'attempts',
        targetValue: 10,
        loggedValue: 0,
      }),
    ).toEqual({ makes: 0, attempts: 10 });
  });
});

describe('fg percentages', () => {
  test('set FG%', () => {
    expect(setFgPct({ targetMode: 'attempts', targetValue: 10, loggedValue: 7 })).toBeCloseTo(0.7);
    expect(setFgPct({ targetMode: 'attempts', targetValue: 10, loggedValue: 0 })).toBe(0);
    expect(setFgPct({ targetMode: 'makes', targetValue: 5, loggedValue: 5 })).toBe(1);
    expect(setFgPct({ targetMode: 'makes', targetValue: 5, loggedValue: null })).toBeNull();
  });
  test('fgRatio is null with no attempts', () => {
    expect(fgRatio(0, 0)).toBeNull();
    expect(fgRatio(1, 4)).toBe(0.25);
  });
});

describe('fgBand', () => {
  test('the thresholds', () => {
    expect(FG_GOOD_PCT).toBe(60);
    expect(FG_POOR_PCT).toBe(40);
  });

  test.each([
    [null, 'none'],
    [0, 'poor'],
    [0.399, 'poor'],
    [0.4, 'neutral'],
    [0.599, 'neutral'],
    [0.6, 'good'],
    [1, 'good'],
    // on the rounded percent: 0.5996 reads "60%", 0.3996 reads "40%"
    [0.5996, 'good'],
    [0.3996, 'neutral'],
  ] as const)('%s -> %s', (ratio, band) => {
    expect(fgBand(ratio)).toBe(band);
  });
});
