import type { BaseRecord } from './records';

export type Sex = 'male' | 'female' | 'other';

/**
 * Which Mifflin-St Jeor variant to use. Users who choose sex "other" pick
 * one, or use the average of the two.
 */
export type FormulaSex = 'male' | 'female' | 'average';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';

export type GoalType =
  | 'lose_fat'
  | 'build_muscle'
  | 'recomp'
  | 'get_stronger'
  | 'maintain'
  | 'general_fitness';

export type Experience = 'beginner' | 'intermediate' | 'advanced';

export type EquipmentAccess = 'gym' | 'home' | 'none';

export type InjuryArea = 'shoulder' | 'elbow' | 'wrist' | 'lower_back' | 'hip' | 'knee' | 'ankle';

export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'halal'
  | 'kosher'
  | 'dairy_free'
  | 'gluten_free';

/** Everything onboarding asks about the person. Goals live separately. */
export interface Profile extends BaseRecord {
  birthYear: number;
  /** 1-12 */
  birthMonth: number;
  sex: Sex;
  formulaSex: FormulaSex;
  heightCm: number;
  /** Bodyweight when onboarding was last completed. The weight log comes in Phase 4. */
  weightKg: number;
  activityLevel: ActivityLevel;
  /** Has a medical condition, or is pregnant or breastfeeding. Disables deficits. */
  healthFlag: boolean;
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: EquipmentAccess;
  injuries: InjuryArea[];
  injuryNotes: string;
  dietaryPreferences: DietaryPreference[];
  foodsToAvoid: string;
  mealsPerDay: number;
}

export interface Goal extends BaseRecord {
  type: GoalType;
  targetWeightKg?: number;
  timeframeWeeks?: number;
  /** Only one goal is active at a time; older ones are kept for history. */
  active: boolean;
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Lightly active (exercise 1–3 days a week)',
  moderate: 'Moderately active (exercise 3–5 days a week)',
  very: 'Very active (hard exercise 6–7 days a week)',
  extra: 'Extremely active (physical job plus training)',
};

export const GOAL_LABELS: Record<GoalType, string> = {
  lose_fat: 'Lose fat',
  build_muscle: 'Build muscle',
  recomp: 'Recomp (lose fat, build muscle)',
  get_stronger: 'Get stronger',
  maintain: 'Maintain',
  general_fitness: 'General fitness',
};

export const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: 'Beginner (under 1 year)',
  intermediate: 'Intermediate (1–3 years)',
  advanced: 'Advanced (3+ years)',
};

export const EQUIPMENT_LABELS: Record<EquipmentAccess, string> = {
  gym: 'Full gym',
  home: 'Home: dumbbells, a bench and a pull-up bar',
  none: 'No equipment',
};

export const INJURY_LABELS: Record<InjuryArea, string> = {
  shoulder: 'Shoulder',
  elbow: 'Elbow',
  wrist: 'Wrist',
  lower_back: 'Lower back',
  hip: 'Hip',
  knee: 'Knee',
  ankle: 'Ankle',
};

export const DIET_LABELS: Record<DietaryPreference, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  halal: 'Halal',
  kosher: 'Kosher',
  dairy_free: 'Dairy-free',
  gluten_free: 'Gluten-free',
};
