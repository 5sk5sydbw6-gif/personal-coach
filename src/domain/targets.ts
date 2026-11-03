import type { ActivityLevel, FormulaSex, GoalType } from './profile';
import {
  calorieFloor,
  dailyKcalForWeeklyChange,
  MAX_GAIN_FRACTION_PER_WEEK,
  MAX_LOSS_FRACTION_PER_WEEK,
  type TargetValues,
  weeklyChangeKg,
} from './safety';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

/** Protein per kg of bodyweight, by goal. Higher when dieting to protect muscle. */
export const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  lose_fat: 2.0,
  recomp: 2.0,
  build_muscle: 1.8,
  get_stronger: 1.8,
  maintain: 1.6,
  general_fitness: 1.6,
};

/** Default weekly change, as a fraction of bodyweight, when no target date is given. */
const DEFAULT_LOSS_FRACTION = 0.005;
const DEFAULT_GAIN_FRACTION = 0.0025;
/** Recomp uses a small deficit: 10% below maintenance. */
const RECOMP_DEFICIT_FRACTION = 0.1;
/** Above this BMI, protein is based on the weight at this BMI so it stays realistic. */
const PROTEIN_REFERENCE_BMI = 27;
const MIN_FAT_FRACTION = 0.25;
const MIN_FAT_G_PER_KG = 0.6;

export interface TargetInput {
  age: number;
  formulaSex: FormulaSex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  healthFlag: boolean;
  goal: {
    type: GoalType;
    targetWeightKg?: number;
    timeframeWeeks?: number;
  };
}

export interface TargetCalculation {
  values: TargetValues;
  bmr: number;
  activityFactor: number;
  maintenanceKcal: number;
  /** Planned change in kg per week (negative = loss) after all limits. */
  weeklyChangeKg: number;
  /** Plain-English explanation of each number, in order. */
  explanations: string[];
  /** Anything the coach changed or wants to flag (caps, floors, GP advice). */
  notes: string[];
}

/** Mifflin-St Jeor resting energy expenditure in kcal/day. */
export function mifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  formulaSex: FormulaSex,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const sexConstant = { male: 5, female: -161, average: -78 }[formulaSex];
  return base + sexConstant;
}

export function calculateTargets(input: TargetInput): TargetCalculation {
  const { weightKg, heightCm, age, formulaSex, activityLevel, goal } = input;
  const explanations: string[] = [];
  const notes: string[] = [];

  // 1. Resting burn and maintenance.
  const bmr = Math.round(mifflinStJeor(weightKg, heightCm, age, formulaSex));
  const activityFactor = ACTIVITY_FACTORS[activityLevel];
  const maintenanceKcal = Math.round(bmr * activityFactor);
  const formulaLabel = { male: 'male', female: 'female', average: 'average of male and female' }[
    formulaSex
  ];
  explanations.push(
    `Resting burn (BMR): ${fmt(bmr)} kcal. This is roughly what your body uses at rest, from the Mifflin-St Jeor formula with your age (${age}), height (${heightCm} cm), weight (${round1(weightKg)} kg) and the ${formulaLabel} formula.`,
  );
  explanations.push(
    `Maintenance: ${fmt(maintenanceKcal)} kcal. That's your BMR × ${activityFactor} for your activity level. Eating about this much should keep your weight steady.`,
  );

  // 2. Daily adjustment for the goal.
  let adjustment = goalAdjustment(input, maintenanceKcal, notes);
  if (input.healthFlag && adjustment < 0) {
    adjustment = 0;
    notes.push(
      "Because you mentioned a medical condition, pregnancy or breastfeeding, the coach hasn't set a calorie deficit. Please talk to your GP before trying to lose weight.",
    );
  }

  // 3. Apply the calorie floor.
  let calories = Math.round((maintenanceKcal + adjustment) / 10) * 10;
  const floor = calorieFloor(formulaSex);
  if (calories < floor) {
    calories = floor;
    notes.push(
      `Your target was raised to ${fmt(floor)} kcal, the minimum the coach will set. Going lower isn't safe without medical supervision.`,
    );
  }
  const actualChange = weeklyChangeKg(calories - maintenanceKcal);
  explanations.push(goalExplanation(goal.type, calories - maintenanceKcal, actualChange, weightKg));

  // 4. Macros: protein first, then fat, carbs fill the rest.
  const referenceWeight = PROTEIN_REFERENCE_BMI * (heightCm / 100) ** 2;
  const proteinBasisKg = Math.min(weightKg, referenceWeight);
  const proteinPerKg = PROTEIN_G_PER_KG[goal.type];
  let proteinG = Math.round(proteinPerKg * proteinBasisKg);
  let fatG = Math.round(Math.max((MIN_FAT_FRACTION * calories) / 9, MIN_FAT_G_PER_KG * weightKg));
  let carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);
  if (carbsG < 0) {
    // Only at very low calories: keep protein, trim fat to fit.
    carbsG = 0;
    fatG = Math.max(0, Math.round((calories - proteinG * 4) / 9));
    if (fatG === 0) proteinG = Math.round(calories / 4);
  }

  const basisNote =
    proteinBasisKg < weightKg
      ? ` We used ${round1(proteinBasisKg)} kg rather than your full weight, so the target stays realistic.`
      : '';
  explanations.push(
    `Protein: ${proteinG} g (${proteinPerKg} g per kg of bodyweight). ${proteinReason(goal.type)}${basisNote}`,
  );
  explanations.push(
    `Fat: ${fatG} g (about ${Math.round(((fatG * 9) / calories) * 100)}% of calories). Enough fat supports hormones and general health.`,
  );
  explanations.push(
    `Carbs: ${carbsG} g. These are the calories left after protein and fat, and they fuel your training.`,
  );
  explanations.push(
    'These are starting estimates. The weekly check-in (coming in Phase 4) will fine-tune them using your real weight trend.',
  );

  return {
    values: { calories, proteinG, carbsG, fatG },
    bmr,
    activityFactor,
    maintenanceKcal,
    weeklyChangeKg: actualChange,
    explanations,
    notes,
  };
}

/** Daily kcal above (+) or below (-) maintenance for the goal, within safety limits. */
function goalAdjustment(input: TargetInput, maintenanceKcal: number, notes: string[]): number {
  const { weightKg, goal } = input;
  const maxLoss = weightKg * MAX_LOSS_FRACTION_PER_WEEK;
  const maxGain = weightKg * MAX_GAIN_FRACTION_PER_WEEK;

  switch (goal.type) {
    case 'lose_fat': {
      let rate = weightKg * DEFAULT_LOSS_FRACTION;
      const requested = requestedRate(input);
      if (requested !== undefined) {
        if (requested < 0) {
          rate = Math.min(-requested, maxLoss);
          if (-requested > maxLoss + 1e-9) {
            notes.push(
              `Reaching your target in ${goal.timeframeWeeks} weeks would mean losing ${round2(-requested)} kg a week. The coach caps loss at 1% of bodyweight (${round2(maxLoss)} kg a week), so it will take a bit longer.`,
            );
          }
        } else {
          notes.push(
            "Your target weight isn't below your current weight, so the coach used a steady default rate of loss instead.",
          );
        }
      }
      return -dailyKcalForWeeklyChange(rate);
    }
    case 'build_muscle': {
      let rate = weightKg * DEFAULT_GAIN_FRACTION;
      const requested = requestedRate(input);
      if (requested !== undefined) {
        if (requested > 0) {
          rate = Math.min(requested, maxGain);
          if (requested > maxGain + 1e-9) {
            notes.push(
              `Reaching your target in ${goal.timeframeWeeks} weeks would mean gaining ${round2(requested)} kg a week. The coach caps planned gain at 0.5% of bodyweight (${round2(maxGain)} kg a week), because faster gain is mostly fat.`,
            );
          }
        } else {
          notes.push(
            "Your target weight isn't above your current weight, so the coach used a slow default rate of gain instead.",
          );
        }
      }
      return dailyKcalForWeeklyChange(rate);
    }
    case 'recomp':
      return -RECOMP_DEFICIT_FRACTION * maintenanceKcal;
    case 'get_stronger':
    case 'maintain':
    case 'general_fitness':
      return 0;
  }
}

/** kg per week implied by target weight and timeframe, if both were given. */
function requestedRate(input: TargetInput): number | undefined {
  const { targetWeightKg, timeframeWeeks } = input.goal;
  if (targetWeightKg === undefined || !timeframeWeeks) return undefined;
  return (targetWeightKg - input.weightKg) / timeframeWeeks;
}

function goalExplanation(
  goal: GoalType,
  dailyDifference: number,
  kgPerWeek: number,
  weightKg: number,
): string {
  if (Math.abs(dailyDifference) < 5) {
    const why =
      goal === 'get_stronger'
        ? 'Eating at maintenance supports strength gains without adding much fat.'
        : 'Eating at maintenance keeps your weight steady.';
    return `Goal adjustment: none. ${why}`;
  }
  const direction = dailyDifference < 0 ? 'lose' : 'gain';
  const percent = ((Math.abs(kgPerWeek) / weightKg) * 100).toFixed(2);
  const sign = dailyDifference < 0 ? '−' : '+';
  const recompNote =
    goal === 'recomp'
      ? ' For a recomp the coach uses a small deficit (10% below maintenance), so you can lose fat while still building muscle.'
      : '';
  return `Goal adjustment: ${sign}${fmt(Math.round(Math.abs(dailyDifference)))} kcal a day, aiming to ${direction} about ${round2(Math.abs(kgPerWeek))} kg a week (${percent}% of your bodyweight). Each kg is roughly 7,700 kcal.${recompNote}`;
}

function proteinReason(goal: GoalType): string {
  switch (goal) {
    case 'lose_fat':
    case 'recomp':
      return 'Higher protein helps you keep muscle while losing fat, and keeps you full.';
    case 'build_muscle':
    case 'get_stronger':
      return 'This gives your muscles what they need to grow and recover.';
    case 'maintain':
    case 'general_fitness':
      return 'A solid amount for an active person.';
  }
}

/** 12345 -> "12,345" without relying on the platform's locale data. */
export function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): string {
  return n.toFixed(2);
}
