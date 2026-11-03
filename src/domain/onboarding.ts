import { ageFromBirth } from './dates';
import type { PlanInput } from './plan';
import type {
  ActivityLevel,
  DietaryPreference,
  EquipmentAccess,
  Experience,
  FormulaSex,
  Goal,
  GoalType,
  InjuryArea,
  Profile,
  Sex,
} from './profile';
import type { NewRecord } from './records';
import { isAdult, MIN_AGE } from './safety';
import type { TargetInput } from './targets';

/** Answers while the questionnaire is being filled in: anything may be missing. */
export interface OnboardingAnswers {
  birthYear?: number;
  birthMonth?: number;
  sex?: Sex;
  formulaSex?: FormulaSex;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  healthFlag: boolean;
  goalType?: GoalType;
  targetWeightKg?: number;
  timeframeWeeks?: number;
  experience?: Experience;
  daysPerWeek?: number;
  sessionMinutes?: number;
  equipment?: EquipmentAccess;
  injuries: InjuryArea[];
  injuryNotes: string;
  dietaryPreferences: DietaryPreference[];
  foodsToAvoid: string;
  mealsPerDay?: number;
}

export const EMPTY_ANSWERS: OnboardingAnswers = {
  healthFlag: false,
  injuries: [],
  injuryNotes: '',
  dietaryPreferences: [],
  foodsToAvoid: '',
  mealsPerDay: 3,
};

export const ONBOARDING_STEPS = ['basics', 'goal', 'training', 'food'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6];
export const SESSION_MINUTE_OPTIONS = [30, 45, 60, 75, 90];
export const MEALS_PER_DAY_OPTIONS = [2, 3, 4, 5, 6];

/** Goals where a target weight and timeframe make sense. */
export function goalUsesTargetWeight(goal: GoalType | undefined): boolean {
  return goal === 'lose_fat' || goal === 'build_muscle';
}

/** Field name -> message. Empty means the step is complete. */
export type StepErrors = Partial<Record<keyof OnboardingAnswers | 'age', string>>;

export function validateStep(
  step: OnboardingStep,
  a: OnboardingAnswers,
  today: Date,
): StepErrors {
  const errors: StepErrors = {};
  switch (step) {
    case 'basics': {
      const year = today.getFullYear();
      if (!isInt(a.birthYear) || a.birthYear < year - 110 || a.birthYear > year) {
        errors.birthYear = 'Enter the year you were born, e.g. 2003.';
      }
      if (!isInt(a.birthMonth) || a.birthMonth < 1 || a.birthMonth > 12) {
        errors.birthMonth = 'Choose your birth month.';
      }
      if (!errors.birthYear && !errors.birthMonth) {
        if (!isAdult(ageFromBirth(a.birthYear!, a.birthMonth!, today))) {
          errors.age = `Personal Coach is for adults aged ${MIN_AGE} and over only.`;
        }
      }
      if (!a.sex) errors.sex = 'Choose an option.';
      if (a.sex === 'other' && !a.formulaSex) errors.formulaSex = 'Choose which formula to use.';
      if (!inRange(a.heightCm, 120, 230)) errors.heightCm = 'Enter a height between 120 and 230 cm.';
      if (!inRange(a.weightKg, 35, 300)) errors.weightKg = 'Enter a weight between 35 and 300 kg.';
      if (!a.activityLevel) errors.activityLevel = 'Choose your activity level.';
      break;
    }
    case 'goal': {
      if (!a.goalType) errors.goalType = 'Choose a goal.';
      if (goalUsesTargetWeight(a.goalType)) {
        const hasTarget = a.targetWeightKg !== undefined;
        const hasTime = a.timeframeWeeks !== undefined;
        if (hasTarget && !inRange(a.targetWeightKg, 35, 300)) {
          errors.targetWeightKg = 'Enter a target between 35 and 300 kg, or leave it blank.';
        }
        if (hasTime && (!isInt(a.timeframeWeeks) || a.timeframeWeeks < 1 || a.timeframeWeeks > 104)) {
          errors.timeframeWeeks = 'Enter a whole number of weeks from 1 to 104, or leave it blank.';
        }
        if (hasTarget !== hasTime) {
          const field = hasTarget ? 'timeframeWeeks' : 'targetWeightKg';
          errors[field] ??= 'Fill in both target weight and timeframe, or leave both blank.';
        }
      }
      break;
    }
    case 'training': {
      if (!a.experience) errors.experience = 'Choose your experience.';
      if (!a.daysPerWeek || !DAYS_PER_WEEK_OPTIONS.includes(a.daysPerWeek)) {
        errors.daysPerWeek = 'Choose how many days a week.';
      }
      if (!a.sessionMinutes || !SESSION_MINUTE_OPTIONS.includes(a.sessionMinutes)) {
        errors.sessionMinutes = 'Choose a session length.';
      }
      if (!a.equipment) errors.equipment = 'Choose your equipment.';
      break;
    }
    case 'food': {
      if (!a.mealsPerDay || !MEALS_PER_DAY_OPTIONS.includes(a.mealsPerDay)) {
        errors.mealsPerDay = 'Choose how many meals a day.';
      }
      break;
    }
  }
  return errors;
}

export function isComplete(a: OnboardingAnswers, today: Date): boolean {
  return ONBOARDING_STEPS.every((s) => Object.keys(validateStep(s, a, today)).length === 0);
}

/** Converts complete answers into records to save. Throws if anything is invalid. */
export function toProfileAndGoal(
  a: OnboardingAnswers,
  today: Date,
): { profile: NewRecord<Profile>; goal: NewRecord<Goal> } {
  if (!isComplete(a, today)) throw new Error('Onboarding answers are incomplete');
  const usesTarget = goalUsesTargetWeight(a.goalType);
  return {
    profile: {
      birthYear: a.birthYear!,
      birthMonth: a.birthMonth!,
      sex: a.sex!,
      formulaSex: a.sex === 'other' ? a.formulaSex! : a.sex!,
      heightCm: a.heightCm!,
      weightKg: a.weightKg!,
      activityLevel: a.activityLevel!,
      healthFlag: a.healthFlag,
      experience: a.experience!,
      daysPerWeek: a.daysPerWeek!,
      sessionMinutes: a.sessionMinutes!,
      equipment: a.equipment!,
      injuries: a.injuries,
      injuryNotes: a.injuryNotes.trim(),
      dietaryPreferences: a.dietaryPreferences,
      foodsToAvoid: a.foodsToAvoid.trim(),
      mealsPerDay: a.mealsPerDay!,
    },
    goal: {
      type: a.goalType!,
      targetWeightKg: usesTarget ? a.targetWeightKg : undefined,
      timeframeWeeks: usesTarget ? a.timeframeWeeks : undefined,
      active: true,
    },
  };
}

/** Pre-fills the questionnaire when redoing onboarding. */
export function answersFromProfile(profile: Profile, goal: Goal | undefined): OnboardingAnswers {
  return {
    birthYear: profile.birthYear,
    birthMonth: profile.birthMonth,
    sex: profile.sex,
    formulaSex: profile.formulaSex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activityLevel: profile.activityLevel,
    healthFlag: profile.healthFlag,
    goalType: goal?.type,
    targetWeightKg: goal?.targetWeightKg,
    timeframeWeeks: goal?.timeframeWeeks,
    experience: profile.experience,
    daysPerWeek: profile.daysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment,
    injuries: [...profile.injuries],
    injuryNotes: profile.injuryNotes,
    dietaryPreferences: [...profile.dietaryPreferences],
    foodsToAvoid: profile.foodsToAvoid,
    mealsPerDay: profile.mealsPerDay,
  };
}

export function targetInputFrom(
  profile: NewRecord<Profile>,
  goal: NewRecord<Goal>,
  today: Date,
): TargetInput {
  return {
    age: ageFromBirth(profile.birthYear, profile.birthMonth, today),
    formulaSex: profile.formulaSex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activityLevel: profile.activityLevel,
    healthFlag: profile.healthFlag,
    goal: {
      type: goal.type,
      targetWeightKg: goal.targetWeightKg,
      timeframeWeeks: goal.timeframeWeeks,
    },
  };
}

export function planInputFrom(profile: NewRecord<Profile>, goal: NewRecord<Goal>): PlanInput {
  return {
    goal: goal.type,
    experience: profile.experience,
    daysPerWeek: profile.daysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment,
    injuries: profile.injuries,
    injuryNotes: profile.injuryNotes,
  };
}

function isInt(n: number | undefined): n is number {
  return n !== undefined && Number.isInteger(n);
}

function inRange(n: number | undefined, min: number, max: number): boolean {
  return n !== undefined && Number.isFinite(n) && n >= min && n <= max;
}
