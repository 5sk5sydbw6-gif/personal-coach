import { generatePlan, type GeneratedPlan, type PlanInput } from './plan';
import type { BaseRecord } from './records';
import type { FormulaSex } from './profile';
import type { TargetValues } from './safety';
import { calculateTargets, type TargetCalculation, type TargetInput } from './targets';

/**
 * The single interface screens and workflows use to get coaching.
 *
 * Today it is implemented by the deterministic RuleBasedCoach. Later an AI
 * coach can implement the same interface (or wrap the rule-based one).
 * Methods return Promises so a provider that calls a server fits without
 * changes. Safety limits are NOT the provider's job: the workflow checks
 * every proposal against them, so no provider can bypass them.
 *
 * Phase 3 adds progression suggestions; Phase 4 adds the weekly check-in.
 */
export interface CoachProvider {
  /** Stored with every coach event, so you can see who made a suggestion. */
  readonly name: string;
  proposeTargets(input: TargetInput): Promise<TargetCalculation>;
  proposePlan(input: PlanInput): Promise<GeneratedPlan>;
}

export class RuleBasedCoach implements CoachProvider {
  readonly name = 'rule-based-v1';

  async proposeTargets(input: TargetInput): Promise<TargetCalculation> {
    return calculateTargets(input);
  }

  async proposePlan(input: PlanInput): Promise<GeneratedPlan> {
    return generatePlan(input);
  }
}

export type TargetsStatus = 'proposed' | 'active' | 'rejected' | 'superseded';

/** Daily calorie and macro targets, with the context they were set in. */
export interface DailyTargets extends BaseRecord, TargetValues {
  status: TargetsStatus;
  source: 'coach' | 'manual';
  /** Local date (YYYY-MM-DD) these became active. */
  effectiveFrom?: string;
  maintenanceKcal: number;
  weeklyChangeKg: number;
  explanations: string[];
  notes: string[];
  // Snapshot of the inputs safety checks need, so edits can be validated later.
  formulaSex: FormulaSex;
  weightKg: number;
  healthFlag: boolean;
}

export type CoachEventType = 'targets_proposed' | 'plan_proposed' | 'targets_manual_edit';

export type CoachDecision = 'pending' | 'accepted' | 'edited' | 'rejected' | 'superseded';

/** Every suggestion the coach makes, and what the user decided. */
export interface CoachEvent extends BaseRecord {
  type: CoachEventType;
  /** Which CoachProvider made it, or 'user' for manual changes. */
  provider: string;
  /** The record the suggestion is about (a DailyTargets or TrainingPlan id). */
  subjectId: string;
  summary: string;
  decision: CoachDecision;
  decidedAt?: string;
}
