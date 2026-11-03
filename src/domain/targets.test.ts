import { checkTargets } from './safety';
import { calculateTargets, fmt, mifflinStJeor, type TargetInput } from './targets';

// Worked example, by hand:
// BMR = 10×80 + 6.25×180 − 5×24 + 5 = 1810
// Maintenance = 1810 × 1.55 = 2805.5 → 2806
const base: TargetInput = {
  age: 24,
  formulaSex: 'male',
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  healthFlag: false,
  goal: { type: 'maintain' },
};

describe('mifflinStJeor', () => {
  it('matches the published formula for each sex', () => {
    expect(mifflinStJeor(80, 180, 24, 'male')).toBe(1810);
    expect(mifflinStJeor(80, 180, 24, 'female')).toBe(1644);
    expect(mifflinStJeor(80, 180, 24, 'average')).toBe(1727);
  });
});

describe('calculateTargets', () => {
  it('computes BMR and maintenance', () => {
    const result = calculateTargets(base);
    expect(result.bmr).toBe(1810);
    expect(result.activityFactor).toBe(1.55);
    expect(result.maintenanceKcal).toBe(2806);
    expect(result.values.calories).toBe(2810);
    expect(result.weeklyChangeKg).toBeCloseTo(0, 2);
  });

  it('sets a 0.5%/week deficit for fat loss by default, with macros', () => {
    // 0.5% of 80 kg = 0.4 kg/week = 440 kcal/day. 2806 − 440 = 2366 → 2370
    const { values, weeklyChangeKg } = calculateTargets({ ...base, goal: { type: 'lose_fat' } });
    expect(values.calories).toBe(2370);
    expect(values.proteinG).toBe(160); // 2.0 g × 80 kg
    expect(values.fatG).toBe(66); // 25% of 2370 kcal / 9
    expect(values.carbsG).toBe(284); // (2370 − 640 − 594) / 4
    expect(weeklyChangeKg).toBeCloseTo(-0.4, 2);
  });

  it('caps an aggressive timeframe at 1% of bodyweight per week', () => {
    // 10 kg in 5 weeks = 2 kg/week; cap is 0.8 kg/week = 880 kcal/day
    const result = calculateTargets({
      ...base,
      goal: { type: 'lose_fat', targetWeightKg: 70, timeframeWeeks: 5 },
    });
    expect(result.values.calories).toBe(1930); // 2806 − 880 = 1926 → 1930
    expect(result.weeklyChangeKg).toBeGreaterThanOrEqual(-0.8);
    expect(result.notes.join(' ')).toMatch(/caps loss at 1%/);
  });

  it('uses the requested rate when it is within limits', () => {
    // 4 kg in 20 weeks = 0.2 kg/week = 220 kcal/day
    const result = calculateTargets({
      ...base,
      goal: { type: 'lose_fat', targetWeightKg: 76, timeframeWeeks: 20 },
    });
    expect(result.values.calories).toBe(2590);
    expect(result.notes).toEqual([]);
  });

  it('never goes below the calorie floor', () => {
    const result = calculateTargets({
      age: 30,
      formulaSex: 'female',
      heightCm: 165,
      weightKg: 60,
      activityLevel: 'sedentary',
      healthFlag: false,
      goal: { type: 'lose_fat', targetWeightKg: 50, timeframeWeeks: 4 },
    });
    expect(result.values.calories).toBe(1200);
    expect(result.notes.join(' ')).toMatch(/minimum the coach will set/);
    // Loss is still within 1%/week because the floor only raises calories
    expect(-result.weeklyChangeKg).toBeLessThanOrEqual(0.6);
  });

  it('uses the floor for the average formula too', () => {
    const result = calculateTargets({
      age: 60,
      formulaSex: 'average',
      heightCm: 150,
      weightKg: 50,
      activityLevel: 'sedentary',
      healthFlag: false,
      goal: { type: 'lose_fat' },
    });
    expect(result.values.calories).toBeGreaterThanOrEqual(1350);
  });

  it('sets no deficit when the health flag is on', () => {
    const result = calculateTargets({ ...base, healthFlag: true, goal: { type: 'lose_fat' } });
    expect(result.values.calories).toBe(2810);
    expect(result.notes.join(' ')).toMatch(/GP/);
  });

  it('adds a small surplus for muscle gain, capped at 0.5%/week', () => {
    // Default 0.25% of 80 = 0.2 kg/week = 220 kcal
    expect(calculateTargets({ ...base, goal: { type: 'build_muscle' } }).values.calories).toBe(
      3030,
    );
    // Asking for 10 kg in 10 weeks is capped at 0.4 kg/week = 440 kcal
    const capped = calculateTargets({
      ...base,
      goal: { type: 'build_muscle', targetWeightKg: 90, timeframeWeeks: 10 },
    });
    expect(capped.values.calories).toBe(3250);
    expect(capped.notes.join(' ')).toMatch(/0.5% of bodyweight/);
  });

  it('ignores a target weight on the wrong side of current weight', () => {
    const result = calculateTargets({
      ...base,
      goal: { type: 'lose_fat', targetWeightKg: 85, timeframeWeeks: 10 },
    });
    expect(result.values.calories).toBe(2370); // falls back to default
    expect(result.notes.join(' ')).toMatch(/isn't below/);
  });

  it('uses a 10% deficit for recomp', () => {
    // 2806 × 0.9 = 2525.4 → 2530
    expect(calculateTargets({ ...base, goal: { type: 'recomp' } }).values.calories).toBe(2530);
  });

  it('bases protein on a reference weight for high BMI', () => {
    // 180 cm at BMI 27 = 87.48 kg; 1.6 g × 87.48 = 140 g
    const result = calculateTargets({ ...base, weightKg: 130 });
    expect(result.values.proteinG).toBe(140);
    expect(result.explanations.join(' ')).toMatch(/rather than your full weight/);
  });

  it('produces macros that add up to the calorie target', () => {
    for (const type of ['lose_fat', 'build_muscle', 'recomp', 'get_stronger'] as const) {
      const { values } = calculateTargets({ ...base, goal: { type } });
      const kcal = values.proteinG * 4 + values.carbsG * 4 + values.fatG * 9;
      expect(Math.abs(kcal - values.calories)).toBeLessThan(15);
    }
  });

  it('explains every number in plain English', () => {
    const { explanations } = calculateTargets({ ...base, goal: { type: 'lose_fat' } });
    const text = explanations.join('\n');
    expect(text).toMatch(/BMR\): 1,810 kcal/);
    expect(text).toMatch(/Maintenance: 2,806 kcal/);
    expect(text).toMatch(/−436 kcal a day, aiming to lose about 0.40 kg a week/); // after rounding to 2370
    expect(text).toMatch(/Protein: 160 g/);
    expect(text).toMatch(/Fat: 66 g/);
    expect(text).toMatch(/Carbs: 284 g/);
  });

  it('always produces targets that pass the safety check', () => {
    const goals = ['lose_fat', 'build_muscle', 'recomp', 'get_stronger', 'maintain'] as const;
    for (const type of goals) {
      for (const weightKg of [45, 60, 80, 120]) {
        for (const formulaSex of ['male', 'female', 'average'] as const) {
          const input = { ...base, weightKg, formulaSex, goal: { type, targetWeightKg: 40, timeframeWeeks: 2 } };
          const result = calculateTargets(input);
          const check = checkTargets(result.values, {
            formulaSex,
            weightKg,
            maintenanceKcal: result.maintenanceKcal,
            healthFlag: false,
          });
          expect(check.errors).toEqual([]);
        }
      }
    }
  });
});

describe('fmt', () => {
  it('adds thousands separators', () => {
    expect(fmt(950)).toBe('950');
    expect(fmt(2806)).toBe('2,806');
    expect(fmt(1234567)).toBe('1,234,567');
  });
});
