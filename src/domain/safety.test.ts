import { ageFromBirth, toLocalDateString } from './dates';
import { calorieFloor, checkTargets, isAdult, type TargetContext } from './safety';

const ctx: TargetContext = {
  formulaSex: 'male',
  weightKg: 80,
  maintenanceKcal: 2800,
  healthFlag: false,
};

describe('checkTargets', () => {
  it('accepts sensible targets', () => {
    const result = checkTargets({ calories: 2400, proteinG: 160, carbsG: 280, fatG: 70 }, ctx);
    expect(result).toEqual({ errors: [], warnings: [] });
  });

  it('blocks calories below the floor', () => {
    const result = checkTargets({ calories: 1400, proteinG: 160, carbsG: 100, fatG: 40 }, ctx);
    expect(result.errors.join(' ')).toMatch(/below the safe minimum of 1500/);
  });

  it('blocks a deficit faster than 1% of bodyweight per week', () => {
    // 0.8 kg/week = 880 kcal/day, so the lowest allowed is 1920
    const tooLow = checkTargets({ calories: 1800, proteinG: 160, carbsG: 150, fatG: 60 }, ctx);
    expect(tooLow.errors.join(' ')).toMatch(/more than 1% of your bodyweight.*1920 kcal/);
    const ok = checkTargets({ calories: 1920, proteinG: 160, carbsG: 175, fatG: 60 }, ctx);
    expect(ok.errors).toEqual([]);
  });

  it('blocks negative or missing numbers', () => {
    const result = checkTargets({ calories: 2400, proteinG: -1, carbsG: NaN, fatG: 70 }, ctx);
    expect(result.errors).toHaveLength(2);
  });

  it('warns when macros do not add up to calories', () => {
    const result = checkTargets({ calories: 2400, proteinG: 100, carbsG: 100, fatG: 30 }, ctx);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toMatch(/don't match|doesn't match/);
  });

  it('warns about very low protein', () => {
    const result = checkTargets({ calories: 2400, proteinG: 50, carbsG: 400, fatG: 67 }, ctx);
    expect(result.warnings.join(' ')).toMatch(/0.8 g per kg/);
  });

  it('warns about a fast surplus', () => {
    const result = checkTargets({ calories: 3600, proteinG: 160, carbsG: 500, fatG: 100 }, ctx);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toMatch(/most extra weight is fat/);
  });

  it('warns about any deficit when the health flag is on', () => {
    const result = checkTargets(
      { calories: 2400, proteinG: 160, carbsG: 280, fatG: 70 },
      { ...ctx, healthFlag: true },
    );
    expect(result.warnings.join(' ')).toMatch(/GP/);
  });
});

describe('limits', () => {
  it('has a calorie floor for each formula', () => {
    expect(calorieFloor('female')).toBe(1200);
    expect(calorieFloor('male')).toBe(1500);
    expect(calorieFloor('average')).toBe(1350);
  });

  it('allows 18 and over only', () => {
    expect(isAdult(17)).toBe(false);
    expect(isAdult(18)).toBe(true);
  });
});

describe('dates', () => {
  it('works out age from birth year and month', () => {
    const today = new Date(2026, 10, 3); // 3 Nov 2026
    expect(ageFromBirth(2008, 11, today)).toBe(18); // birthday month: turned 18
    expect(ageFromBirth(2008, 12, today)).toBe(17); // not yet
    expect(ageFromBirth(2000, 1, today)).toBe(26);
  });

  it('formats local dates', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
