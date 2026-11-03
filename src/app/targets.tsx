import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { acceptTargets, getPlan, getTargets, saveEditedTargets } from '@/data/coachWorkflow';
import { useData } from '@/data/DataProvider';
import type { DailyTargets } from '@/domain/coach';
import { checkTargets, type TargetValues } from '@/domain/safety';
import { fmt } from '@/domain/format';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { MacroSummary } from '@/ui/MacroSummary';
import { Notice } from '@/ui/Notice';
import { NumberField } from '@/ui/NumberField';
import { Screen } from '@/ui/Screen';
import { spacing, type } from '@/ui/theme';

/**
 * Shows the coach's proposed targets (or the active ones) with the
 * reasoning, and lets the user accept or edit them.
 */
export default function TargetsScreen() {
  const data = useData();
  const [targets, setTargets] = useState<DailyTargets | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setTargets((await getTargets(data, 'proposed')) ?? (await getTargets(data, 'active')) ?? null);
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  /** After a decision, go on to review the plan if one is waiting. */
  async function continueAfterDecision() {
    if (await getPlan(data, 'proposed')) router.replace('/plan');
    else router.replace('/');
  }

  if (targets === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Targets' }} />
      </Screen>
    );
  }
  if (targets === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Targets' }} />
        <Text style={type.body}>No targets yet. Complete onboarding first.</Text>
        <Button title="Get started" onPress={() => router.replace('/onboarding')} />
      </Screen>
    );
  }

  const proposed = targets.status === 'proposed';

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit targets' }} />
        <TargetEditor
          targets={targets}
          onCancel={() => setEditing(false)}
          onSave={async (values) => {
            const result = await saveEditedTargets(data, targets.id, values, new Date());
            if (!result.saved) return result.check.errors;
            await continueAfterDecision();
            return [];
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: proposed ? 'Suggested targets' : 'Your targets' }} />
      <Text style={type.title}>{proposed ? "Your coach's suggestion" : 'Your daily targets'}</Text>
      {proposed && (
        <Text style={type.muted}>Nothing changes until you accept or edit these.</Text>
      )}

      <Card>
        <MacroSummary values={targets} />
      </Card>

      {targets.notes.map((note) => (
        <Notice key={note} tone="warning">
          {note}
        </Notice>
      ))}

      <Card title={targets.source === 'manual' ? 'About these targets' : 'How the coach worked these out'}>
        <View style={styles.list}>
          {targets.explanations.map((line) => (
            <Text key={line} style={type.body}>
              • {line}
            </Text>
          ))}
        </View>
      </Card>

      {proposed ? (
        <View style={styles.actions}>
          <Button
            title="Accept these targets"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              await acceptTargets(data, targets.id, new Date());
              await continueAfterDecision();
            }}
          />
          <Button title="Edit before accepting" variant="secondary" onPress={() => setEditing(true)} />
          <Button title="Decide later" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button title="Edit targets" variant="secondary" onPress={() => setEditing(true)} />
          <Button title="Back to home" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      )}
    </Screen>
  );
}

function TargetEditor({
  targets,
  onCancel,
  onSave,
}: {
  targets: DailyTargets;
  onCancel: () => void;
  /** Returns blocking errors, or [] on success. */
  onSave: (values: TargetValues) => Promise<string[]>;
}) {
  const [values, setValues] = useState<Partial<TargetValues>>({
    calories: targets.calories,
    proteinG: targets.proteinG,
    carbsG: targets.carbsG,
    fatG: targets.fatG,
  });
  const [saving, setSaving] = useState(false);

  // Live safety check as the user types, using the same rules as the coach.
  const check = useMemo(() => {
    const complete = {
      calories: values.calories ?? NaN,
      proteinG: values.proteinG ?? NaN,
      carbsG: values.carbsG ?? NaN,
      fatG: values.fatG ?? NaN,
    };
    return {
      complete,
      ...checkTargets(complete, {
        formulaSex: targets.formulaSex,
        weightKg: targets.weightKg,
        maintenanceKcal: targets.maintenanceKcal,
        healthFlag: targets.healthFlag,
      }),
    };
  }, [values, targets]);

  const macroKcal =
    (values.proteinG ?? 0) * 4 + (values.carbsG ?? 0) * 4 + (values.fatG ?? 0) * 9;

  return (
    <>
      <Text style={type.title}>Edit targets</Text>
      <Text style={type.muted}>
        Your estimated maintenance is {fmt(targets.maintenanceKcal)} kcal a day. The coach checks
        your numbers against the same safety limits it uses itself.
      </Text>
      <NumberField
        label="Calories"
        suffix="kcal"
        value={values.calories}
        onChange={(calories) => setValues({ ...values, calories })}
      />
      <View style={styles.row}>
        <NumberField label="Protein" suffix="g" value={values.proteinG} onChange={(proteinG) => setValues({ ...values, proteinG })} />
        <NumberField label="Carbs" suffix="g" value={values.carbsG} onChange={(carbsG) => setValues({ ...values, carbsG })} />
        <NumberField label="Fat" suffix="g" value={values.fatG} onChange={(fatG) => setValues({ ...values, fatG })} />
      </View>
      <Text style={type.muted}>Your macros add up to {fmt(macroKcal)} kcal.</Text>

      {check.errors.map((e) => (
        <Notice key={e} tone="danger">
          {e}
        </Notice>
      ))}
      {check.warnings.map((w) => (
        <Notice key={w} tone="warning">
          {w}
        </Notice>
      ))}

      <View style={styles.actions}>
        <Button
          title="Save targets"
          disabled={saving || check.errors.length > 0}
          onPress={async () => {
            setSaving(true);
            const errors = await onSave(check.complete);
            if (errors.length > 0) setSaving(false);
          }}
        />
        <Button title="Cancel" variant="secondary" onPress={onCancel} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  actions: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
});
