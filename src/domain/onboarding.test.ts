import {
  answersFromProfile,
  EMPTY_ANSWERS,
  isComplete,
  type OnboardingAnswers,
  planInputFrom,
  targetInputFrom,
  toProfileAndGoal,
  validateStep,
} from './onboarding';
import type { Goal, Profile } from './profile';

const today = new Date(2026, 10, 3);

const completeAnswers: OnboardingAnswers = {
  ...EMPTY_ANSWERS,
  birthYear: 2002,
  birthMonth: 6,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  goalType: 'lose_fat',
  targetWeightKg: 75,
  timeframeWeeks: 12,
  experience: 'beginner',
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: 'gym',
  mealsPerDay: 3,
};

describe('validateStep', () => {
  it('accepts complete answers', () => {
    expect(isComplete(completeAnswers, today)).toBe(true);
  });

  it('requires the basics', () => {
    const errors = validateStep('basics', EMPTY_ANSWERS, today);
    expect(Object.keys(errors).sort()).toEqual(
      ['activityLevel', 'birthMonth', 'birthYear', 'heightCm', 'sex', 'weightKg'].sort(),
    );
  });

  it('blocks under-18s', () => {
    const errors = validateStep('basics', { ...completeAnswers, birthYear: 2009, birthMonth: 1 }, today);
    expect(errors.age).toMatch(/18 and over/);
  });

  it('allows someone who turned 18 this month', () => {
    const errors = validateStep('basics', { ...completeAnswers, birthYear: 2008, birthMonth: 11 }, today);
    expect(errors.age).toBeUndefined();
  });

  it('asks which formula to use when sex is other', () => {
    const errors = validateStep('basics', { ...completeAnswers, sex: 'other' }, today);
    expect(errors.formulaSex).toBeDefined();
    const ok = validateStep('basics', { ...completeAnswers, sex: 'other', formulaSex: 'average' }, today);
    expect(ok).toEqual({});
  });

  it('rejects out-of-range height and weight', () => {
    const errors = validateStep('basics', { ...completeAnswers, heightCm: 50, weightKg: 500 }, today);
    expect(errors.heightCm).toBeDefined();
    expect(errors.weightKg).toBeDefined();
  });

  it('needs target weight and timeframe together, or neither', () => {
    const onlyTarget = { ...completeAnswers, timeframeWeeks: undefined };
    expect(validateStep('goal', onlyTarget, today).timeframeWeeks).toBeDefined();
    const neither = { ...completeAnswers, targetWeightKg: undefined, timeframeWeeks: undefined };
    expect(validateStep('goal', neither, today)).toEqual({});
  });

  it('ignores target weight for goals that do not use it', () => {
    const answers = { ...completeAnswers, goalType: 'get_stronger' as const, timeframeWeeks: undefined };
    expect(validateStep('goal', answers, today)).toEqual({});
  });

  it('requires training and food answers', () => {
    expect(Object.keys(validateStep('training', EMPTY_ANSWERS, today))).toHaveLength(4);
    expect(validateStep('food', { ...EMPTY_ANSWERS, mealsPerDay: undefined }, today).mealsPerDay).toBeDefined();
  });
});

describe('toProfileAndGoal', () => {
  it('builds records, using sex as the formula for male and female', () => {
    const { profile, goal } = toProfileAndGoal(completeAnswers, today);
    expect(profile.formulaSex).toBe('male');
    expect(goal).toEqual({ type: 'lose_fat', targetWeightKg: 75, timeframeWeeks: 12, active: true });
  });

  it('drops target weight for goals that do not use it', () => {
    const { goal } = toProfileAndGoal({ ...completeAnswers, goalType: 'maintain' }, today);
    expect(goal.targetWeightKg).toBeUndefined();
  });

  it('throws on incomplete answers', () => {
    expect(() => toProfileAndGoal(EMPTY_ANSWERS, today)).toThrow();
  });

  it('round-trips through answersFromProfile for redoing onboarding', () => {
    const { profile, goal } = toProfileAndGoal(completeAnswers, today);
    const stored = { ...profile, id: 'p', userId: 'u', createdAt: '', updatedAt: '' } as Profile;
    const storedGoal = { ...goal, id: 'g', userId: 'u', createdAt: '', updatedAt: '' } as Goal;
    expect(answersFromProfile(stored, storedGoal)).toEqual({ ...completeAnswers, formulaSex: 'male' });
  });

  it('builds coach inputs with the current age', () => {
    const { profile, goal } = toProfileAndGoal(completeAnswers, today);
    expect(targetInputFrom(profile, goal, today).age).toBe(24);
    expect(planInputFrom(profile, goal)).toMatchObject({ goal: 'lose_fat', daysPerWeek: 3 });
  });
});
