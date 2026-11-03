import type { FormulaSex } from './profile';

/**
 * Coach safety limits. Every target or suggestion passes through these,
 * including targets the user edits by hand. Values are deliberately
 * conservative: this is a coach, not a doctor or dietitian.
 */

export const MIN_AGE = 18;

/** Roughly 1% of bodyweight per week is the upper end of sensible fat loss. */
export const MAX_LOSS_FRACTION_PER_WEEK = 0.01;

/** Faster gain is mostly fat, so the coach won't plan more than this. */
export const MAX_GAIN_FRACTION_PER_WEEK = 0.005;

/** Energy in 1 kg of body weight change, a common working estimate. */
export const KCAL_PER_KG = 7700;

/** Common conservative minimums for unsupervised diets. */
export function calorieFloor(formulaSex: FormulaSex): number {
  switch (formulaSex) {
    case 'female':
      return 1200;
    case 'male':
      return 1500;
    case 'average':
      return 1350;
  }
}

export function isAdult(age: number): boolean {
  return age >= MIN_AGE;
}

/** Converts a daily calorie difference from maintenance into kg per week. */
export function weeklyChangeKg(dailyKcalDifference: number): number {
  return (dailyKcalDifference * 7) / KCAL_PER_KG;
}

/** Converts a weekly weight change into a daily calorie difference. */
export function dailyKcalForWeeklyChange(kgPerWeek: number): number {
  return (kgPerWeek * KCAL_PER_KG) / 7;
}

export const GP_NOTE =
  'This app is a coach, not a doctor or dietitian. If you have a medical condition, or are pregnant or breastfeeding, please check your plan with your GP first.';

export const PHYSIO_NOTE =
  "If anything hurts, stop and get it checked by a GP or physio. The coach can't diagnose or treat injuries.";

export interface TargetValues {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface TargetContext {
  formulaSex: FormulaSex;
  weightKg: number;
  /** Estimated maintenance calories. */
  maintenanceKcal: number;
  healthFlag: boolean;
}

export interface TargetCheck {
  /** Problems that block saving. */
  errors: string[];
  /** Worth knowing, but the user may go ahead. */
  warnings: string[];
}

/**
 * Checks a set of targets (typically edited by hand) against the safety
 * limits. Errors block saving; warnings are shown but allowed.
 */
export function checkTargets(values: TargetValues, ctx: TargetContext): TargetCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { calories, proteinG, carbsG, fatG } = values;

  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`${labelFor(name)} must be a number of 0 or more.`);
    }
  }
  if (errors.length) return { errors, warnings };

  const floor = calorieFloor(ctx.formulaSex);
  if (calories < floor) {
    errors.push(
      `${calories} kcal is below the safe minimum of ${floor} kcal a day. The coach won't set targets below this.`,
    );
  }

  const deficit = ctx.maintenanceKcal - calories;
  const maxLossKg = ctx.weightKg * MAX_LOSS_FRACTION_PER_WEEK;
  if (deficit > 0 && weeklyChangeKg(deficit) > maxLossKg + 0.005) {
    const maxDeficit = Math.round(dailyKcalForWeeklyChange(maxLossKg));
    errors.push(
      `That's about ${weeklyChangeKg(deficit).toFixed(2)} kg of loss a week, more than 1% of your bodyweight (${maxLossKg.toFixed(2)} kg). Keep calories at or above ${ctx.maintenanceKcal - maxDeficit} kcal.`,
    );
  }

  if (ctx.healthFlag && deficit > 0) {
    warnings.push(
      'You told us about a medical condition, pregnancy or breastfeeding. Please agree any calorie deficit with your GP first.',
    );
  }

  const surplus = calories - ctx.maintenanceKcal;
  const maxGainKg = ctx.weightKg * MAX_GAIN_FRACTION_PER_WEEK;
  if (surplus > 0 && weeklyChangeKg(surplus) > maxGainKg + 0.005) {
    warnings.push(
      `That's about ${weeklyChangeKg(surplus).toFixed(2)} kg of gain a week. Beyond about ${maxGainKg.toFixed(2)} kg a week, most extra weight is fat.`,
    );
  }

  const macroKcal = proteinG * 4 + carbsG * 4 + fatG * 9;
  if (calories > 0 && Math.abs(macroKcal - calories) / calories > 0.1) {
    warnings.push(
      `Your macros add up to ${Math.round(macroKcal)} kcal, which doesn't match your ${calories} kcal target.`,
    );
  }

  if (proteinG < 0.8 * ctx.weightKg) {
    warnings.push(
      `${proteinG} g protein is under 0.8 g per kg of bodyweight, the basic daily requirement. More helps when training.`,
    );
  }

  return { errors, warnings };
}

function labelFor(key: string): string {
  return (
    { calories: 'Calories', proteinG: 'Protein', carbsG: 'Carbs', fatG: 'Fat' }[key] ?? key
  );
}
