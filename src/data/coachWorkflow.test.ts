import { RuleBasedCoach } from '@/domain/coach';
import { EMPTY_ANSWERS, type OnboardingAnswers } from '@/domain/onboarding';

import {
  acceptPlan,
  acceptTargets,
  completeOnboarding,
  getActiveGoal,
  getPlan,
  getProfile,
  getTargets,
  rejectPlan,
  saveEditedTargets,
} from './coachWorkflow';
import { createDataLayer } from './dataLayer';
import { createMemoryKeyValueStore } from './keyValueStore';

const today = new Date(2026, 10, 3);
const coach = new RuleBasedCoach();

const answers: OnboardingAnswers = {
  ...EMPTY_ANSWERS,
  birthYear: 2002,
  birthMonth: 6,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  goalType: 'lose_fat',
  experience: 'beginner',
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: 'gym',
  mealsPerDay: 3,
};

function setup() {
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 10, 3, 12, 0, tick++));
  return createDataLayer(createMemoryKeyValueStore(), 'local-user', now);
}

describe('completeOnboarding', () => {
  it('saves the profile and goal, and proposes targets and a plan without activating them', async () => {
    const data = setup();
    const { targets, plan } = await completeOnboarding(data, coach, answers, today);

    expect((await getProfile(data))?.weightKg).toBe(80);
    expect((await getActiveGoal(data))?.type).toBe('lose_fat');
    expect(targets.status).toBe('proposed');
    expect(targets.calories).toBe(2370);
    expect(plan.status).toBe('proposed');
    expect(await getTargets(data, 'active')).toBeUndefined();
    expect(await getPlan(data, 'active')).toBeUndefined();

    const events = await data.coachEvents.list();
    expect(events.map((e) => [e.type, e.decision, e.provider])).toEqual([
      ['targets_proposed', 'pending', 'rule-based-v1'],
      ['plan_proposed', 'pending', 'rule-based-v1'],
    ]);
  });

  it('keeps current targets active when onboarding is redone, until the new ones are accepted', async () => {
    const data = setup();
    const first = await completeOnboarding(data, coach, answers, today);
    await acceptTargets(data, first.targets.id, today);

    const second = await completeOnboarding(data, coach, { ...answers, goalType: 'maintain' }, today);
    expect((await getTargets(data, 'active'))?.id).toBe(first.targets.id);
    expect((await getTargets(data, 'proposed'))?.id).toBe(second.targets.id);
    expect((await data.goals.list()).filter((g) => g.active)).toHaveLength(1);
    expect(await data.profiles.list()).toHaveLength(1);

    // The unanswered plan proposal from the first run is superseded
    expect((await data.trainingPlans.get(first.plan.id))?.status).toBe('superseded');
    const firstPlanEvent = (await data.coachEvents.list()).find((e) => e.subjectId === first.plan.id);
    expect(firstPlanEvent?.decision).toBe('superseded');
  });
});

describe('targets', () => {
  it('accepting activates the proposal and logs the decision', async () => {
    const data = setup();
    const { targets } = await completeOnboarding(data, coach, answers, today);
    await acceptTargets(data, targets.id, today);

    const active = await getTargets(data, 'active');
    expect(active?.id).toBe(targets.id);
    expect(active?.effectiveFrom).toBe('2026-11-03');
    const event = (await data.coachEvents.list()).find((e) => e.subjectId === targets.id);
    expect(event?.decision).toBe('accepted');
  });

  it('blocks edited targets that break the safety limits', async () => {
    const data = setup();
    const { targets } = await completeOnboarding(data, coach, answers, today);
    const result = await saveEditedTargets(
      data,
      targets.id,
      { calories: 1200, proteinG: 160, carbsG: 50, fatG: 40 },
      today,
    );
    expect(result.saved).toBeUndefined();
    expect(result.check.errors.length).toBeGreaterThan(0);
    expect(await getTargets(data, 'active')).toBeUndefined();
    expect((await getTargets(data, 'proposed'))?.id).toBe(targets.id);
  });

  it('saves safe edits to a proposal as manual targets, logged as edited', async () => {
    const data = setup();
    const { targets } = await completeOnboarding(data, coach, answers, today);
    const values = { calories: 2400, proteinG: 170, carbsG: 285, fatG: 65 };
    const { saved } = await saveEditedTargets(data, targets.id, values, today);

    expect(saved).toMatchObject({ ...values, status: 'active', source: 'manual' });
    expect((await data.dailyTargets.get(targets.id))?.status).toBe('superseded');
    const event = (await data.coachEvents.list()).find((e) => e.subjectId === targets.id);
    expect(event?.decision).toBe('edited');
  });

  it('logs a manual edit of active targets as its own event', async () => {
    const data = setup();
    const { targets } = await completeOnboarding(data, coach, answers, today);
    await acceptTargets(data, targets.id, today);
    const { saved } = await saveEditedTargets(
      data,
      targets.id,
      { calories: 2500, proteinG: 160, carbsG: 320, fatG: 70 },
      today,
    );
    expect((await getTargets(data, 'active'))?.id).toBe(saved?.id);
    const manual = (await data.coachEvents.list()).find((e) => e.type === 'targets_manual_edit');
    expect(manual).toMatchObject({ provider: 'user', decision: 'accepted', subjectId: saved?.id });
  });
});

describe('plan', () => {
  it('accepting unchanged logs accepted; accepting with edits logs edited', async () => {
    const data = setup();
    const { plan } = await completeOnboarding(data, coach, answers, today);
    await acceptPlan(data, plan.id, today, plan.days);
    expect((await getPlan(data, 'active'))?.id).toBe(plan.id);
    expect((await data.coachEvents.list()).find((e) => e.subjectId === plan.id)?.decision).toBe(
      'accepted',
    );

    const second = await completeOnboarding(data, coach, answers, today);
    const edited = second.plan.days.map((d, i) =>
      i === 0 ? { ...d, exercises: d.exercises.map((e) => ({ ...e, sets: 5 })) } : d,
    );
    await acceptPlan(data, second.plan.id, today, edited);
    const active = await getPlan(data, 'active');
    expect(active?.id).toBe(second.plan.id);
    expect(active?.days[0].exercises[0].sets).toBe(5);
    expect((await data.trainingPlans.get(plan.id))?.status).toBe('superseded');
    expect(
      (await data.coachEvents.list()).find((e) => e.subjectId === second.plan.id)?.decision,
    ).toBe('edited');
  });

  it('rejecting leaves the current plan in place', async () => {
    const data = setup();
    const first = await completeOnboarding(data, coach, answers, today);
    await acceptPlan(data, first.plan.id, today);
    const second = await completeOnboarding(data, coach, answers, today);
    await rejectPlan(data, second.plan.id, today);

    expect((await getPlan(data, 'active'))?.id).toBe(first.plan.id);
    expect(
      (await data.coachEvents.list()).find((e) => e.subjectId === second.plan.id)?.decision,
    ).toBe('rejected');
  });
});
