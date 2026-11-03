import type { EquipmentAccess, InjuryArea } from './profile';

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'glutes'
  | 'hamstrings'
  | 'quads'
  | 'calves'
  | 'core'
  | 'biceps'
  | 'triceps'
  | 'shoulders';

/** Big multi-joint lifts. They get lower reps, more sets and longer rest. */
export const COMPOUND_PATTERNS: ReadonlySet<MovementPattern> = new Set([
  'squat',
  'hinge',
  'lunge',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
]);

export type Kit = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bench' | 'pullup_bar' | 'bodyweight';

export const KIT_FOR_EQUIPMENT: Record<EquipmentAccess, ReadonlySet<Kit>> = {
  gym: new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bench', 'pullup_bar', 'bodyweight']),
  home: new Set(['dumbbell', 'bench', 'pullup_bar', 'bodyweight']),
  none: new Set(['bodyweight']),
};

export interface Exercise {
  id: string;
  name: string;
  pattern: MovementPattern;
  /** Every item listed is needed. */
  kit: Kit[];
  /** Joints this exercise loads heavily. Used to avoid injured areas. */
  stresses: InjuryArea[];
  /** Easier to learn; preferred for beginners. */
  beginnerFriendly: boolean;
  /** Most exercises count reps; holds like the plank count seconds. */
  measure: 'reps' | 'seconds';
}

function ex(
  id: string,
  name: string,
  pattern: MovementPattern,
  kit: Kit[],
  stresses: InjuryArea[],
  beginnerFriendly = true,
  measure: 'reps' | 'seconds' = 'reps',
): Exercise {
  return { id, name, pattern, kit, stresses, beginnerFriendly, measure };
}

/**
 * Built-in exercise library. Within each pattern the order is the coach's
 * preference (gym options first; anything that isn't available is skipped).
 */
export const EXERCISES: readonly Exercise[] = [
  // Squat
  ex('back_squat', 'Barbell back squat', 'squat', ['barbell'], ['knee', 'hip', 'lower_back'], false),
  ex('leg_press', 'Leg press', 'squat', ['machine'], ['knee', 'hip']),
  ex('goblet_squat', 'Goblet squat', 'squat', ['dumbbell'], ['knee', 'hip']),
  ex('bodyweight_squat', 'Bodyweight squat', 'squat', ['bodyweight'], ['knee', 'hip']),
  // Hinge
  ex('deadlift', 'Barbell deadlift', 'hinge', ['barbell'], ['lower_back', 'hip'], false),
  ex('romanian_deadlift', 'Romanian deadlift', 'hinge', ['barbell'], ['lower_back', 'hip'], false),
  ex('db_romanian_deadlift', 'Dumbbell Romanian deadlift', 'hinge', ['dumbbell'], ['lower_back', 'hip']),
  ex('single_leg_rdl', 'Single-leg Romanian deadlift', 'hinge', ['bodyweight'], ['hip', 'ankle']),
  // Lunge
  ex('db_split_squat', 'Dumbbell split squat', 'lunge', ['dumbbell'], ['knee', 'hip']),
  ex('step_up', 'Dumbbell step-up', 'lunge', ['dumbbell', 'bench'], ['knee', 'hip']),
  ex('reverse_lunge', 'Reverse lunge', 'lunge', ['bodyweight'], ['knee', 'hip', 'ankle']),
  // Horizontal push
  ex('bench_press', 'Barbell bench press', 'horizontal_push', ['barbell', 'bench'], ['shoulder', 'elbow', 'wrist'], false),
  ex('db_bench_press', 'Dumbbell bench press', 'horizontal_push', ['dumbbell', 'bench'], ['shoulder', 'elbow']),
  ex('machine_chest_press', 'Machine chest press', 'horizontal_push', ['machine'], ['shoulder', 'elbow']),
  ex('incline_db_press', 'Incline dumbbell press', 'horizontal_push', ['dumbbell', 'bench'], ['shoulder', 'elbow']),
  ex('push_up', 'Push-up', 'horizontal_push', ['bodyweight'], ['shoulder', 'elbow', 'wrist']),
  // Vertical push
  ex('overhead_press', 'Barbell overhead press', 'vertical_push', ['barbell'], ['shoulder', 'elbow', 'wrist', 'lower_back'], false),
  ex('db_shoulder_press', 'Dumbbell shoulder press', 'vertical_push', ['dumbbell'], ['shoulder', 'elbow']),
  ex('pike_push_up', 'Pike push-up', 'vertical_push', ['bodyweight'], ['shoulder', 'elbow', 'wrist']),
  // Horizontal pull
  ex('barbell_row', 'Barbell row', 'horizontal_pull', ['barbell'], ['lower_back', 'elbow'], false),
  ex('seated_cable_row', 'Seated cable row', 'horizontal_pull', ['cable'], ['elbow']),
  ex('db_row', 'One-arm dumbbell row', 'horizontal_pull', ['dumbbell', 'bench'], ['elbow']),
  ex('inverted_row', 'Inverted row (under a sturdy table)', 'horizontal_pull', ['bodyweight'], ['elbow']),
  ex('doorframe_row', 'Doorframe row', 'horizontal_pull', ['bodyweight'], ['elbow']),
  // Vertical pull
  ex('lat_pulldown', 'Lat pulldown', 'vertical_pull', ['cable'], ['shoulder', 'elbow']),
  ex('pull_up', 'Pull-up (or assisted pull-up)', 'vertical_pull', ['pullup_bar'], ['shoulder', 'elbow'], false),
  ex('negative_pull_up', 'Negative pull-up', 'vertical_pull', ['pullup_bar'], ['shoulder', 'elbow']),
  // Glutes
  ex('hip_thrust', 'Barbell hip thrust', 'glutes', ['barbell', 'bench'], ['hip']),
  ex('glute_bridge', 'Glute bridge', 'glutes', ['bodyweight'], ['hip']),
  // Hamstrings
  ex('leg_curl', 'Leg curl', 'hamstrings', ['machine'], ['knee']),
  ex('hamstring_walkout', 'Hamstring walkout', 'hamstrings', ['bodyweight'], ['hip']),
  // Quads
  ex('leg_extension', 'Leg extension', 'quads', ['machine'], ['knee']),
  // Calves
  ex('calf_raise', 'Standing calf raise', 'calves', ['bodyweight'], ['ankle']),
  // Core
  ex('plank', 'Plank', 'core', ['bodyweight'], [], true, 'seconds'),
  ex('dead_bug', 'Dead bug', 'core', ['bodyweight'], []),
  ex('hanging_knee_raise', 'Hanging knee raise', 'core', ['pullup_bar'], ['shoulder']),
  // Biceps
  ex('db_curl', 'Dumbbell curl', 'biceps', ['dumbbell'], ['elbow']),
  ex('cable_curl', 'Cable curl', 'biceps', ['cable'], ['elbow']),
  ex('hammer_curl', 'Hammer curl', 'biceps', ['dumbbell'], ['elbow']),
  // Triceps
  ex('triceps_pushdown', 'Triceps pushdown', 'triceps', ['cable'], ['elbow']),
  ex('overhead_triceps_extension', 'Overhead dumbbell triceps extension', 'triceps', ['dumbbell'], ['elbow', 'shoulder']),
  ex('close_grip_push_up', 'Close-grip push-up', 'triceps', ['bodyweight'], ['elbow', 'wrist', 'shoulder']),
  // Shoulders
  ex('lateral_raise', 'Dumbbell lateral raise', 'shoulders', ['dumbbell'], ['shoulder']),
  ex('face_pull', 'Cable face pull', 'shoulders', ['cable'], ['shoulder']),
  ex('prone_ytw', 'Prone Y-T-W raise', 'shoulders', ['bodyweight'], ['shoulder']),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const exercise = BY_ID.get(id);
  if (!exercise) throw new Error(`Unknown exercise: ${id}`);
  return exercise;
}

export function hasKit(exercise: Exercise, equipment: EquipmentAccess): boolean {
  const available = KIT_FOR_EQUIPMENT[equipment];
  return exercise.kit.every((k) => available.has(k));
}

export function avoidsInjuries(exercise: Exercise, injuries: readonly InjuryArea[]): boolean {
  return !exercise.stresses.some((area) => injuries.includes(area));
}
