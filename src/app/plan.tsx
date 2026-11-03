import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { acceptPlan, getPlan, getProfile, rejectPlan } from '@/data/coachWorkflow';
import { useData } from '@/data/DataProvider';
import { getExercise } from '@/domain/exercises';
import { nextAlternative, type PlanDay, type PlannedExercise, type TrainingPlan } from '@/domain/plan';
import type { Profile } from '@/domain/profile';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Notice } from '@/ui/Notice';
import { Screen } from '@/ui/Screen';
import { Stepper } from '@/ui/Stepper';
import { colors, radius, spacing, type } from '@/ui/theme';

/**
 * Shows the coach's proposed plan (or the active one). A proposal can be
 * accepted as is, edited and then accepted, or rejected.
 */
export default function PlanScreen() {
  const data = useData();
  const [plan, setPlan] = useState<TrainingPlan | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile>();
  const [days, setDays] = useState<PlanDay[]>([]);
  const [editing, setEditing] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const current = (await getPlan(data, 'proposed')) ?? (await getPlan(data, 'active')) ?? null;
      setPlan(current);
      setDays(current?.days ?? []);
      setProfile(await getProfile(data));
    })();
  }, [data]);

  if (plan === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Training plan' }} />
      </Screen>
    );
  }

  if (rejected || plan === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Training plan' }} />
        <Text style={type.body}>
          {rejected
            ? 'Plan rejected. Any plan you had before stays in place. To get a different suggestion, redo onboarding with different training answers.'
            : 'No training plan yet. Complete onboarding first.'}
        </Text>
        <Button title="Back to home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const proposed = plan.status === 'proposed';

  function updateExercise(dayIndex: number, exIndex: number, changes: Partial<PlannedExercise>) {
    setDays(
      days.map((day, d) =>
        d !== dayIndex
          ? day
          : {
              ...day,
              exercises: day.exercises.map((ex, e) => (e === exIndex ? { ...ex, ...changes } : ex)),
            },
      ),
    );
  }

  /** Cycles through suitable alternatives (same movement, your equipment and injuries). */
  function alternative(dayIndex: number, exIndex: number) {
    if (!profile) return undefined;
    const ids = new Set(days[dayIndex].exercises.map((e) => e.exerciseId));
    return nextAlternative(days[dayIndex].exercises[exIndex].exerciseId, profile, ids);
  }

  function swap(dayIndex: number, exIndex: number) {
    const next = alternative(dayIndex, exIndex);
    if (next) updateExercise(dayIndex, exIndex, { exerciseId: next.id });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: proposed ? 'Suggested plan' : 'Your plan' }} />
      <Text style={type.title}>{capitalise(plan.name)}</Text>
      {proposed && !editing && (
        <Text style={type.muted}>Nothing changes until you accept, edit or reject this plan.</Text>
      )}
      {editing && (
        <Text style={type.muted}>
          Tap “Swap” for a different exercise of the same kind that suits your equipment and
          injuries, or adjust sets and reps.
        </Text>
      )}

      {!editing && (
        <Card title="Why this plan">
          <View style={styles.list}>
            {plan.notes.map((note) => (
              <Text key={note} style={type.body}>
                • {note}
              </Text>
            ))}
          </View>
        </Card>
      )}

      {days.map((day, d) => (
        <Card key={day.name} title={day.name}>
          {day.exercises.map((ex, e) => {
            const exercise = getExercise(ex.exerciseId);
            const unit = exercise.measure === 'seconds' ? 's' : ' reps';
            return (
              <View key={`${e}-${ex.exerciseId}`} style={styles.exercise}>
                <View style={styles.exerciseHeader}>
                  <Text style={[type.body, styles.exerciseName]}>{exercise.name}</Text>
                  {editing && alternative(d, e) && (
                    <Pressable accessibilityRole="button" onPress={() => swap(d, e)} style={styles.swap}>
                      <Text style={styles.swapText}>Swap</Text>
                    </Pressable>
                  )}
                </View>
                {editing ? (
                  <View style={styles.steppers}>
                    <Stepper label="Sets" value={ex.sets} min={1} max={8} onChange={(sets) => updateExercise(d, e, { sets })} />
                    <Stepper label="Min reps" value={ex.repMin} min={1} max={ex.repMax} onChange={(repMin) => updateExercise(d, e, { repMin })} />
                    <Stepper label="Max reps" value={ex.repMax} min={ex.repMin} max={exercise.measure === 'seconds' ? 120 : 30} onChange={(repMax) => updateExercise(d, e, { repMax })} />
                  </View>
                ) : (
                  <Text style={type.muted}>
                    {ex.sets} sets × {ex.repMin}–{ex.repMax}
                    {unit} · rest {formatRest(ex.restSeconds)}
                  </Text>
                )}
              </View>
            );
          })}
        </Card>
      ))}

      {proposed && !editing && (
        <View style={styles.actions}>
          <Button
            title="Accept this plan"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              await acceptPlan(data, plan.id, new Date());
              router.replace('/');
            }}
          />
          <Button title="Edit before accepting" variant="secondary" onPress={() => setEditing(true)} />
          <Button
            title="Reject this plan"
            variant="danger"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              await rejectPlan(data, plan.id, new Date());
              setRejected(true);
            }}
          />
        </View>
      )}

      {proposed && editing && (
        <View style={styles.actions}>
          <Notice>Your changes are saved when you accept the plan.</Notice>
          <Button
            title="Accept with my changes"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              await acceptPlan(data, plan.id, new Date(), days);
              router.replace('/');
            }}
          />
          <Button
            title="Undo my changes"
            variant="secondary"
            onPress={() => {
              setDays(plan.days);
              setEditing(false);
            }}
          />
        </View>
      )}

      {!proposed && (
        <View style={styles.actions}>
          <Text style={type.muted}>
            Want a different plan? Redo onboarding from the home screen and the coach will suggest a
            new one.
          </Text>
          <Button title="Back to home" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      )}
    </Screen>
  );
}

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s}s`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  actions: { gap: spacing.sm },
  exercise: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseName: { flex: 1, fontWeight: '600' },
  steppers: { gap: spacing.xs },
  swap: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  swapText: { color: colors.primary, fontWeight: '600' },
});
