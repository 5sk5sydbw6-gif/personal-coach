import type { CoachEvent, CoachProvider, DailyTargets } from '@/domain/coach';
import { toLocalDateString } from '@/domain/dates';
import {
  type OnboardingAnswers,
  planInputFrom,
  targetInputFrom,
  toProfileAndGoal,
} from '@/domain/onboarding';
import type { PlanDay, TrainingPlan } from '@/domain/plan';
import type { Goal, Profile } from '@/domain/profile';
import { checkTargets, type TargetCheck, type TargetValues } from '@/domain/safety';

import type { DataLayer } from './dataLayer';

/**
 * Workflows that combine the coach with storage. The key rule lives here:
 * the coach only ever *proposes*. Targets and plans become active only when
 * the user accepts (or edits) them, and every proposal and decision is
 * written to coach_events.
 */

// ---------- Reading ----------

export async function getProfile(data: DataLayer): Promise<Profile | undefined> {
  return (await data.profiles.list())[0];
}

export async function getActiveGoal(data: DataLayer): Promise<Goal | undefined> {
  return (await data.goals.list()).find((g) => g.active);
}

export async function getTargets(
  data: DataLayer,
  status: DailyTargets['status'],
): Promise<DailyTargets | undefined> {
  return latest((await data.dailyTargets.list()).filter((t) => t.status === status));
}

export async function getPlan(
  data: DataLayer,
  status: TrainingPlan['status'],
): Promise<TrainingPlan | undefined> {
  return latest((await data.trainingPlans.list()).filter((p) => p.status === status));
}

function latest<T extends { createdAt: string }>(items: T[]): T | undefined {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

// ---------- Onboarding ----------

/**
 * Saves the questionnaire and asks the coach for targets and a plan.
 * Nothing becomes active: current targets and plan stay in place until
 * the user accepts the new proposals.
 */
export async function completeOnboarding(
  data: DataLayer,
  coach: CoachProvider,
  answers: OnboardingAnswers,
  today: Date,
): Promise<{ targets: DailyTargets; plan: TrainingPlan }> {
  const { profile, goal } = toProfileAndGoal(answers, today);

  const existing = await getProfile(data);
  if (existing) await data.profiles.update(existing.id, profile);
  else await data.profiles.create(profile);

  for (const old of (await data.goals.list()).filter((g) => g.active)) {
    await data.goals.update(old.id, { active: false });
  }
  await data.goals.create(goal);

  await supersedePendingProposals(data, today);

  // Targets: the provider proposes, then the safety check has the final say.
  const calc = await coach.proposeTargets(targetInputFrom(profile, goal, today));
  const check = checkTargets(calc.values, {
    formulaSex: profile.formulaSex,
    weightKg: profile.weightKg,
    maintenanceKcal: calc.maintenanceKcal,
    healthFlag: profile.healthFlag,
  });
  if (check.errors.length > 0) {
    throw new Error(`Coach proposed unsafe targets: ${check.errors.join(' ')}`);
  }
  const targets = await data.dailyTargets.create({
    ...calc.values,
    status: 'proposed',
    source: 'coach',
    maintenanceKcal: calc.maintenanceKcal,
    weeklyChangeKg: calc.weeklyChangeKg,
    explanations: calc.explanations,
    notes: calc.notes,
    formulaSex: profile.formulaSex,
    weightKg: profile.weightKg,
    healthFlag: profile.healthFlag,
  });
  await logEvent(data, {
    type: 'targets_proposed',
    provider: coach.name,
    subjectId: targets.id,
    summary: `Proposed ${targets.calories} kcal, ${targets.proteinG} g protein, ${targets.carbsG} g carbs, ${targets.fatG} g fat.`,
    decision: 'pending',
  });

  const generated = await coach.proposePlan(planInputFrom(profile, goal));
  const plan = await data.trainingPlans.create({ ...generated, status: 'proposed' });
  await logEvent(data, {
    type: 'plan_proposed',
    provider: coach.name,
    subjectId: plan.id,
    summary: `Proposed a ${plan.name} plan.`,
    decision: 'pending',
  });

  return { targets, plan };
}

/** Redoing onboarding replaces any proposals that were never answered. */
async function supersedePendingProposals(data: DataLayer, today: Date): Promise<void> {
  for (const t of await data.dailyTargets.list()) {
    if (t.status === 'proposed') await data.dailyTargets.update(t.id, { status: 'superseded' });
  }
  for (const p of await data.trainingPlans.list()) {
    if (p.status === 'proposed') await data.trainingPlans.update(p.id, { status: 'superseded' });
  }
  for (const e of await data.coachEvents.list()) {
    if (e.decision === 'pending') await decide(data, e, 'superseded', today);
  }
}

// ---------- Targets ----------

export async function acceptTargets(data: DataLayer, targetsId: string, today: Date): Promise<void> {
  const proposal = await data.dailyTargets.get(targetsId);
  if (!proposal || proposal.status !== 'proposed') throw new Error('No pending targets to accept');
  await retireActiveTargets(data);
  await data.dailyTargets.update(targetsId, {
    status: 'active',
    effectiveFrom: toLocalDateString(today),
  });
  await decideEventFor(data, targetsId, 'accepted', today);
}

/**
 * Saves targets the user typed in, starting from a proposal or the active
 * targets. Runs the same safety check as the coach: errors block the save.
 */
export async function saveEditedTargets(
  data: DataLayer,
  baseId: string,
  values: TargetValues,
  today: Date,
): Promise<{ saved?: DailyTargets; check: TargetCheck }> {
  const base = await data.dailyTargets.get(baseId);
  if (!base) throw new Error('Targets not found');
  const check = checkTargets(values, {
    formulaSex: base.formulaSex,
    weightKg: base.weightKg,
    maintenanceKcal: base.maintenanceKcal,
    healthFlag: base.healthFlag,
  });
  if (check.errors.length > 0) return { check };

  await retireActiveTargets(data);
  if (base.status === 'proposed') {
    await data.dailyTargets.update(base.id, { status: 'superseded' });
  }
  const saved = await data.dailyTargets.create({
    ...values,
    status: 'active',
    source: 'manual',
    effectiveFrom: toLocalDateString(today),
    maintenanceKcal: base.maintenanceKcal,
    weeklyChangeKg: ((values.calories - base.maintenanceKcal) * 7) / 7700,
    explanations: [
      `You set these targets yourself. For reference, the coach estimates your maintenance at ${base.maintenanceKcal} kcal a day.`,
    ],
    notes: check.warnings,
    formulaSex: base.formulaSex,
    weightKg: base.weightKg,
    healthFlag: base.healthFlag,
  });

  if (base.status === 'proposed') {
    await decideEventFor(data, base.id, 'edited', today);
  } else {
    await logEvent(data, {
      type: 'targets_manual_edit',
      provider: 'user',
      subjectId: saved.id,
      summary: `Changed targets to ${values.calories} kcal, ${values.proteinG} g protein, ${values.carbsG} g carbs, ${values.fatG} g fat.`,
      decision: 'accepted',
      decidedAt: today.toISOString(),
    });
  }
  return { saved, check };
}

async function retireActiveTargets(data: DataLayer): Promise<void> {
  for (const t of await data.dailyTargets.list()) {
    if (t.status === 'active') await data.dailyTargets.update(t.id, { status: 'superseded' });
  }
}

// ---------- Plan ----------

/**
 * Accepts a proposed plan. If the user changed exercises, sets or reps
 * first, pass the edited days and the decision is logged as 'edited'.
 */
export async function acceptPlan(
  data: DataLayer,
  planId: string,
  today: Date,
  editedDays?: PlanDay[],
): Promise<void> {
  const plan = await data.trainingPlans.get(planId);
  if (!plan || plan.status !== 'proposed') throw new Error('No pending plan to accept');
  for (const p of await data.trainingPlans.list()) {
    if (p.status === 'active') await data.trainingPlans.update(p.id, { status: 'superseded' });
  }
  const edited = editedDays !== undefined && JSON.stringify(editedDays) !== JSON.stringify(plan.days);
  await data.trainingPlans.update(planId, {
    status: 'active',
    ...(edited ? { days: editedDays } : {}),
  });
  await decideEventFor(data, planId, edited ? 'edited' : 'accepted', today);
}

/** Rejects a proposed plan. Any current plan stays as it is. */
export async function rejectPlan(data: DataLayer, planId: string, today: Date): Promise<void> {
  const plan = await data.trainingPlans.get(planId);
  if (!plan || plan.status !== 'proposed') throw new Error('No pending plan to reject');
  await data.trainingPlans.update(planId, { status: 'rejected' });
  await decideEventFor(data, planId, 'rejected', today);
}

// ---------- Coach events ----------

async function logEvent(
  data: DataLayer,
  event: Omit<CoachEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<CoachEvent> {
  return data.coachEvents.create(event);
}

async function decideEventFor(
  data: DataLayer,
  subjectId: string,
  decision: CoachEvent['decision'],
  today: Date,
): Promise<void> {
  const event = (await data.coachEvents.list()).find(
    (e) => e.subjectId === subjectId && e.decision === 'pending',
  );
  if (event) await decide(data, event, decision, today);
}

async function decide(
  data: DataLayer,
  event: CoachEvent,
  decision: CoachEvent['decision'],
  today: Date,
): Promise<void> {
  await data.coachEvents.update(event.id, { decision, decidedAt: today.toISOString() });
}
