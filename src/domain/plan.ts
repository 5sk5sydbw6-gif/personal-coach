import {
  avoidsInjuries,
  COMPOUND_PATTERNS,
  EXERCISES,
  type Exercise,
  getExercise,
  hasKit,
  type MovementPattern,
} from './exercises';
import type { EquipmentAccess, Experience, GoalType, InjuryArea } from './profile';
import type { BaseRecord } from './records';
import { PHYSIO_NOTE } from './safety';

export type Split = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'ppl_upper_lower';

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
}

export interface PlanDay {
  name: string;
  exercises: PlannedExercise[];
}

export type PlanStatus = 'proposed' | 'active' | 'rejected' | 'archived';

/** A weekly training plan. Each day is a workout template. */
export interface TrainingPlan extends BaseRecord {
  name: string;
  split: Split;
  days: PlanDay[];
  notes: string[];
  status: PlanStatus;
}

export interface PlanInput {
  goal: GoalType;
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: EquipmentAccess;
  injuries: InjuryArea[];
  /** Free text the rules can't interpret; only triggers the physio note. */
  injuryNotes: string;
}

export interface GeneratedPlan {
  name: string;
  split: Split;
  days: PlanDay[];
  notes: string[];
}

/** One exercise slot in a day template: a movement pattern, plus which option to prefer. */
type Slot = [MovementPattern, number];

interface DayTemplate {
  name: string;
  slots: Slot[];
}

// Slots are in priority order: shorter sessions keep the first few.
const FULL_A: DayTemplate = {
  name: 'Full body A',
  slots: [['squat', 0], ['horizontal_push', 0], ['horizontal_pull', 0], ['hinge', 1], ['shoulders', 0], ['core', 0], ['biceps', 0]],
};
const FULL_B: DayTemplate = {
  name: 'Full body B',
  slots: [['hinge', 0], ['vertical_push', 0], ['vertical_pull', 0], ['lunge', 0], ['horizontal_push', 1], ['core', 1], ['triceps', 0]],
};
const FULL_C: DayTemplate = {
  name: 'Full body C',
  slots: [['squat', 1], ['horizontal_pull', 1], ['vertical_push', 1], ['glutes', 0], ['vertical_pull', 1], ['calves', 0], ['core', 0]],
};
const UPPER_A: DayTemplate = {
  name: 'Upper A',
  slots: [['horizontal_push', 0], ['horizontal_pull', 0], ['vertical_push', 0], ['vertical_pull', 0], ['shoulders', 0], ['biceps', 0], ['triceps', 0]],
};
const LOWER_A: DayTemplate = {
  name: 'Lower A',
  slots: [['squat', 0], ['hinge', 1], ['lunge', 0], ['hamstrings', 0], ['calves', 0], ['core', 0]],
};
const UPPER_B: DayTemplate = {
  name: 'Upper B',
  slots: [['vertical_pull', 1], ['vertical_push', 1], ['horizontal_pull', 1], ['horizontal_push', 1], ['shoulders', 1], ['triceps', 1], ['biceps', 1]],
};
const LOWER_B: DayTemplate = {
  name: 'Lower B',
  slots: [['hinge', 0], ['squat', 1], ['glutes', 0], ['quads', 0], ['calves', 0], ['core', 1]],
};
const PUSH_A: DayTemplate = {
  name: 'Push A',
  slots: [['horizontal_push', 0], ['vertical_push', 0], ['horizontal_push', 1], ['shoulders', 0], ['triceps', 0], ['triceps', 1]],
};
const PULL_A: DayTemplate = {
  name: 'Pull A',
  slots: [['vertical_pull', 0], ['horizontal_pull', 0], ['horizontal_pull', 1], ['shoulders', 1], ['biceps', 0], ['biceps', 1], ['core', 0]],
};
const LEGS_A: DayTemplate = {
  name: 'Legs A',
  slots: [['squat', 0], ['hinge', 1], ['lunge', 0], ['hamstrings', 0], ['calves', 0], ['core', 1]],
};
const PUSH_B: DayTemplate = {
  name: 'Push B',
  slots: [['vertical_push', 1], ['horizontal_push', 1], ['horizontal_push', 2], ['shoulders', 0], ['triceps', 1], ['triceps', 0]],
};
const PULL_B: DayTemplate = {
  name: 'Pull B',
  slots: [['horizontal_pull', 1], ['vertical_pull', 1], ['horizontal_pull', 2], ['shoulders', 1], ['biceps', 1], ['biceps', 0], ['core', 1]],
};
const LEGS_B: DayTemplate = {
  name: 'Legs B',
  slots: [['hinge', 0], ['squat', 1], ['glutes', 0], ['quads', 0], ['calves', 0], ['core', 0]],
};

/** If no exercise fits a pattern (equipment or injury), try these instead. */
const FALLBACK_PATTERNS: Partial<Record<MovementPattern, MovementPattern[]>> = {
  squat: ['lunge', 'glutes'],
  lunge: ['glutes', 'hinge'],
  hinge: ['glutes', 'hamstrings'],
  quads: ['lunge', 'glutes'],
  hamstrings: ['hinge', 'glutes'],
  vertical_pull: ['horizontal_pull'],
  horizontal_pull: ['vertical_pull'],
  vertical_push: ['horizontal_push'],
  horizontal_push: ['vertical_push'],
};

export function chooseSplit(daysPerWeek: number): { split: Split; days: DayTemplate[]; why: string } {
  if (daysPerWeek <= 3) {
    const days = [FULL_A, FULL_B, FULL_C].slice(0, Math.max(1, daysPerWeek));
    return {
      split: 'full_body',
      days,
      why: `With ${daysPerWeek} day${daysPerWeek === 1 ? '' : 's'} a week, full-body sessions train every major muscle each time, so nothing goes a whole week untrained.`,
    };
  }
  if (daysPerWeek === 4) {
    return {
      split: 'upper_lower',
      days: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
      why: 'With 4 days a week, an upper/lower split trains each muscle twice a week with time to recover in between.',
    };
  }
  if (daysPerWeek === 5) {
    return {
      split: 'ppl_upper_lower',
      days: [PUSH_A, PULL_A, LEGS_A, UPPER_B, LOWER_B],
      why: 'With 5 days a week, push/pull/legs followed by upper/lower hits each muscle about twice a week.',
    };
  }
  return {
    split: 'push_pull_legs',
    days: [PUSH_A, PULL_A, LEGS_A, PUSH_B, PULL_B, LEGS_B].slice(0, daysPerWeek),
    why: 'With 6 days a week, push/pull/legs twice through trains each muscle twice a week while keeping each session focused.',
  };
}

/** Roughly 12–15 minutes per exercise including warm-up sets and rest. */
export function exercisesPerSession(minutes: number): number {
  return Math.max(3, Math.min(7, Math.floor(minutes / 15) + 1));
}

/** Exercises usable for this pattern, in the coach's order of preference. */
export function candidatesFor(
  pattern: MovementPattern,
  input: Pick<PlanInput, 'equipment' | 'injuries' | 'experience'>,
): Exercise[] {
  const usable = EXERCISES.filter(
    (e) => e.pattern === pattern && hasKit(e, input.equipment) && avoidsInjuries(e, input.injuries),
  );
  if (input.experience !== 'beginner') return usable;
  // Stable sort: beginner-friendly options first, otherwise keep library order.
  return [...usable.filter((e) => e.beginnerFriendly), ...usable.filter((e) => !e.beginnerFriendly)];
}

/** Other exercises that could replace this one in a plan (same pattern, same limits). */
export function alternativesFor(
  exerciseId: string,
  input: Pick<PlanInput, 'equipment' | 'injuries' | 'experience'>,
): Exercise[] {
  const current = getExercise(exerciseId);
  return candidatesFor(current.pattern, input).filter((e) => e.id !== exerciseId);
}

export function prescription(
  exercise: Exercise,
  goal: GoalType,
  experience: Experience,
): Omit<PlannedExercise, 'exerciseId'> {
  const compound = COMPOUND_PATTERNS.has(exercise.pattern);
  const sets = compound
    ? { beginner: 3, intermediate: 4, advanced: 4 }[experience]
    : { beginner: 2, intermediate: 3, advanced: 3 }[experience];

  if (exercise.measure === 'seconds') {
    return { sets, repMin: 20, repMax: 45, restSeconds: 60 };
  }
  const bodyweightOnly = exercise.kit.every((k) => k === 'bodyweight' || k === 'pullup_bar');
  if (bodyweightOnly) {
    return { sets, repMin: 8, repMax: 15, restSeconds: compound ? 90 : 60 };
  }
  if (!compound) {
    return { sets, repMin: goal === 'get_stronger' ? 8 : 10, repMax: goal === 'get_stronger' ? 12 : 15, restSeconds: 75 };
  }
  switch (goal) {
    case 'get_stronger':
      return experience === 'beginner'
        ? { sets, repMin: 5, repMax: 8, restSeconds: 150 }
        : { sets, repMin: 4, repMax: 6, restSeconds: 180 };
    case 'build_muscle':
    case 'recomp':
    case 'lose_fat':
      return { sets, repMin: 6, repMax: 10, restSeconds: 120 };
    case 'maintain':
    case 'general_fitness':
      return { sets, repMin: 8, repMax: 12, restSeconds: 90 };
  }
}

/**
 * Builds a starting weekly plan from the user's answers. Deterministic:
 * the same answers always give the same plan, which makes it testable.
 */
export function generatePlan(input: PlanInput): GeneratedPlan {
  const { split, days: templates, why } = chooseSplit(input.daysPerWeek);
  const perSession = exercisesPerSession(input.sessionMinutes);
  const notes: string[] = [why];
  const swapNotes = new Set<string>();
  const injuryFree = { ...input, injuries: [] };

  const days: PlanDay[] = templates.map((template) => {
    const chosen: PlannedExercise[] = [];
    const used = new Set<string>();
    const usedPatterns = new Set<MovementPattern>();

    for (const [pattern, variant] of template.slots) {
      if (chosen.length >= perSession) break;
      const exercise = pick(pattern, variant, input, used, usedPatterns);

      // Note when an injury changed or removed the coach's first choice.
      const preferred = pick(pattern, variant, injuryFree, used, usedPatterns);
      const injuryChanged =
        preferred && preferred.id !== exercise?.id && !avoidsInjuries(preferred, input.injuries);
      if (injuryChanged) {
        const area = injuryText(preferred, input.injuries);
        swapNotes.add(
          exercise
            ? `Swapped ${preferred.name} for ${exercise.name} to go easy on your ${area}.`
            : `Left out ${preferred.name} to go easy on your ${area}.`,
        );
      }
      if (!exercise) continue;

      used.add(exercise.id);
      usedPatterns.add(exercise.pattern);
      chosen.push({ exerciseId: exercise.id, ...prescription(exercise, input.goal, input.experience) });
    }
    return { name: template.name, exercises: chosen };
  });

  notes.push(
    `Each session has about ${perSession} exercises to fit into ${input.sessionMinutes} minutes, including warm-up sets.`,
  );
  notes.push(experienceNote(input.experience));
  if (input.equipment === 'none') {
    notes.push(
      'Bodyweight only: when you reach the top of a rep range on every set, make it harder by slowing the lowering phase or moving to a harder variation.',
    );
  }
  notes.push(...swapNotes);
  if (input.injuries.length > 0 || input.injuryNotes.trim() !== '') {
    notes.push(PHYSIO_NOTE);
  }

  return { name: `${templates.length}-day ${splitLabel(split)}`, split, days, notes };
}

/**
 * Picks an exercise for a slot. If nothing fits the pattern, tries related
 * patterns the day doesn't already include, so a day doesn't end up with
 * several near-identical fallbacks.
 */
function pick(
  pattern: MovementPattern,
  variant: number,
  input: Pick<PlanInput, 'equipment' | 'injuries' | 'experience'>,
  used: Set<string>,
  usedPatterns: Set<MovementPattern>,
): Exercise | undefined {
  const fallbacks = (FALLBACK_PATTERNS[pattern] ?? []).filter((p) => !usedPatterns.has(p));
  for (const p of [pattern, ...fallbacks]) {
    const options = candidatesFor(p, input).filter((e) => !used.has(e.id));
    if (options.length > 0) return options[variant % options.length];
  }
  return undefined;
}

function injuryText(exercise: Exercise, injuries: InjuryArea[]): string {
  const names = exercise.stresses
    .filter((a) => injuries.includes(a))
    .map((a) => a.replace('_', ' '));
  return names.join(' and ');
}

function experienceNote(experience: Experience): string {
  switch (experience) {
    case 'beginner':
      return 'Start lighter than you think. Finish each set with 2–3 reps left in the tank and focus on good form. You will add weight quickly.';
    case 'intermediate':
      return 'Finish most sets with 1–3 reps left in the tank. When you hit the top of the rep range on every set, add a little weight.';
    case 'advanced':
      return 'Push the main lifts close to failure on the last set, and keep 1–2 reps in reserve on the rest.';
  }
}

export function splitLabel(split: Split): string {
  return {
    full_body: 'full body',
    upper_lower: 'upper/lower',
    push_pull_legs: 'push/pull/legs',
    ppl_upper_lower: 'push/pull/legs + upper/lower',
  }[split];
}
