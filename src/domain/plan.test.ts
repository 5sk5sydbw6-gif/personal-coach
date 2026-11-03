import { avoidsInjuries, EXERCISES, getExercise, hasKit } from './exercises';
import {
  alternativesFor,
  chooseSplit,
  exercisesPerSession,
  generatePlan,
  nextAlternative,
  type PlanInput,
  prescription,
} from './plan';
import type { EquipmentAccess, InjuryArea } from './profile';

const base: PlanInput = {
  goal: 'build_muscle',
  experience: 'intermediate',
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: 'gym',
  injuries: [],
  injuryNotes: '',
};

const allExerciseIds = (plan: ReturnType<typeof generatePlan>) =>
  plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));

describe('exercise library', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('checks equipment and injuries', () => {
    expect(hasKit(getExercise('back_squat'), 'home')).toBe(false);
    expect(hasKit(getExercise('goblet_squat'), 'home')).toBe(true);
    expect(hasKit(getExercise('push_up'), 'none')).toBe(true);
    expect(avoidsInjuries(getExercise('back_squat'), ['knee'])).toBe(false);
    expect(avoidsInjuries(getExercise('plank'), ['knee', 'shoulder'])).toBe(true);
  });
});

describe('chooseSplit', () => {
  it.each([
    [2, 'full_body', 2],
    [3, 'full_body', 3],
    [4, 'upper_lower', 4],
    [5, 'ppl_upper_lower', 5],
    [6, 'push_pull_legs', 6],
  ])('%i days -> %s', (days, split, count) => {
    const result = chooseSplit(days);
    expect(result.split).toBe(split);
    expect(result.days).toHaveLength(count);
  });
});

describe('exercisesPerSession', () => {
  it('scales with session length', () => {
    expect(exercisesPerSession(30)).toBe(3);
    expect(exercisesPerSession(45)).toBe(4);
    expect(exercisesPerSession(60)).toBe(5);
    expect(exercisesPerSession(90)).toBe(7);
    expect(exercisesPerSession(120)).toBe(7);
  });
});

describe('prescription', () => {
  it('uses low reps and long rest for strength compounds', () => {
    expect(prescription(getExercise('back_squat'), 'get_stronger', 'advanced')).toEqual({
      sets: 4,
      repMin: 4,
      repMax: 6,
      restSeconds: 180,
    });
  });

  it('uses moderate reps for hypertrophy and fewer sets for beginners', () => {
    expect(prescription(getExercise('goblet_squat'), 'build_muscle', 'beginner')).toEqual({
      sets: 3,
      repMin: 6,
      repMax: 10,
      restSeconds: 120,
    });
    expect(prescription(getExercise('db_curl'), 'build_muscle', 'beginner').sets).toBe(2);
  });

  it('uses seconds for holds', () => {
    expect(prescription(getExercise('plank'), 'lose_fat', 'beginner')).toMatchObject({
      repMin: 20,
      repMax: 45,
    });
  });
});

describe('generatePlan', () => {
  it('is deterministic', () => {
    expect(generatePlan(base)).toEqual(generatePlan(base));
  });

  it('builds one day per training day with the right number of exercises', () => {
    const plan = generatePlan(base);
    expect(plan.name).toBe('3-day full body');
    expect(plan.days.map((d) => d.name)).toEqual(['Full body A', 'Full body B', 'Full body C']);
    for (const day of plan.days) expect(day.exercises).toHaveLength(5);
  });

  it('never repeats an exercise within a day', () => {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      for (const equipment of ['gym', 'home', 'none'] as EquipmentAccess[]) {
        const plan = generatePlan({ ...base, daysPerWeek, equipment, sessionMinutes: 90 });
        for (const day of plan.days) {
          const ids = day.exercises.map((e) => e.exerciseId);
          expect(new Set(ids).size).toBe(ids.length);
        }
      }
    }
  });

  it('only uses exercises the equipment allows', () => {
    for (const equipment of ['home', 'none'] as EquipmentAccess[]) {
      const plan = generatePlan({ ...base, equipment, daysPerWeek: 4 });
      for (const id of allExerciseIds(plan)) {
        expect(hasKit(getExercise(id), equipment)).toBe(true);
      }
    }
  });

  it('still gives at least 3 exercises a day with no equipment', () => {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      const plan = generatePlan({ ...base, equipment: 'none', daysPerWeek, sessionMinutes: 45 });
      for (const day of plan.days) expect(day.exercises.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('avoids exercises that load an injured area and explains the swap', () => {
    const injuries: InjuryArea[] = ['knee'];
    const plan = generatePlan({ ...base, injuries });
    for (const id of allExerciseIds(plan)) {
      expect(avoidsInjuries(getExercise(id), injuries)).toBe(true);
    }
    const notes = plan.notes.join(' ');
    expect(notes).toMatch(/Swapped Barbell back squat for .* to go easy on your knee/);
    expect(notes).toMatch(/GP or physio/);
  });

  it('does not stack several fallback exercises of the same kind in one day', () => {
    // Lower A has no glutes slot of its own; squat and lunge both fall back to glutes
    // with a knee injury, but only the first fallback should be used.
    const plan = generatePlan({ ...base, daysPerWeek: 4, injuries: ['knee'] });
    const lowerA = plan.days.find((d) => d.name === 'Lower A')!;
    const glutes = lowerA.exercises.filter((e) => getExercise(e.exerciseId).pattern === 'glutes');
    expect(glutes).toHaveLength(1);
    expect(plan.notes.join(' ')).toMatch(/Left out Dumbbell split squat to go easy on your knee/);
  });

  it('handles several injuries at once', () => {
    const injuries: InjuryArea[] = ['shoulder', 'lower_back', 'knee'];
    const plan = generatePlan({ ...base, injuries, daysPerWeek: 4 });
    for (const id of allExerciseIds(plan)) {
      expect(avoidsInjuries(getExercise(id), injuries)).toBe(true);
    }
    for (const day of plan.days) expect(day.exercises.length).toBeGreaterThan(0);
  });

  it('adds the physio note for free-text injury notes too', () => {
    const plan = generatePlan({ ...base, injuryNotes: 'tight hamstring' });
    expect(plan.notes.join(' ')).toMatch(/GP or physio/);
  });

  it('gives beginners easier-to-learn lifts first', () => {
    const plan = generatePlan({ ...base, experience: 'beginner' });
    expect(plan.days[0].exercises[0].exerciseId).toBe('leg_press');
    const advanced = generatePlan({ ...base, experience: 'advanced' });
    expect(advanced.days[0].exercises[0].exerciseId).toBe('back_squat');
  });

  it('trims accessories, not main lifts, for short sessions', () => {
    const plan = generatePlan({ ...base, sessionMinutes: 30 });
    expect(plan.days[0].exercises.map((e) => getExercise(e.exerciseId).pattern)).toEqual([
      'squat',
      'horizontal_push',
      'horizontal_pull',
    ]);
  });
});

describe('alternativesFor', () => {
  it('offers same-pattern swaps that respect equipment and injuries', () => {
    const alternatives = alternativesFor('db_bench_press', {
      equipment: 'home',
      injuries: [],
      experience: 'intermediate',
    }).map((e) => e.id);
    expect(alternatives).toEqual(['incline_db_press', 'push_up']);

    const withWristInjury = alternativesFor('db_bench_press', {
      equipment: 'home',
      injuries: ['wrist'],
      experience: 'intermediate',
    }).map((e) => e.id);
    expect(withWristInjury).toEqual(['incline_db_press']);
  });
});

describe('nextAlternative', () => {
  const home = { equipment: 'home' as const, injuries: [], experience: 'intermediate' as const };

  it('cycles through every option and back to the start', () => {
    const seen = ['db_bench_press'];
    for (let i = 0; i < 3; i++) {
      seen.push(nextAlternative(seen[seen.length - 1], home, new Set())!.id);
    }
    expect(seen).toEqual(['db_bench_press', 'incline_db_press', 'push_up', 'db_bench_press']);
  });

  it('skips exercises already in the day', () => {
    expect(nextAlternative('db_bench_press', home, new Set(['incline_db_press']))?.id).toBe('push_up');
  });

  it('returns undefined when there is nothing else', () => {
    expect(nextAlternative('leg_extension', { ...home, equipment: 'gym' }, new Set())).toBeUndefined();
  });
});
