import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getPlan, getProfile, getTargets } from '@/data/coachWorkflow';
import { useData } from '@/data/DataProvider';
import type { DailyTargets } from '@/domain/coach';
import type { TrainingPlan } from '@/domain/plan';
import type { Profile } from '@/domain/profile';
import type { WeightUnit } from '@/domain/records';
import { GP_NOTE } from '@/domain/safety';
import { formatWeight } from '@/domain/units';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { SingleChoice } from '@/ui/Choice';
import { MacroSummary } from '@/ui/MacroSummary';
import { Notice } from '@/ui/Notice';
import { Screen } from '@/ui/Screen';
import { spacing, type } from '@/ui/theme';
import { useSettings } from '@/ui/useSettings';

interface HomeState {
  profile?: Profile;
  activeTargets?: DailyTargets;
  pendingTargets?: DailyTargets;
  activePlan?: TrainingPlan;
  pendingPlan?: TrainingPlan;
}

const UNIT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
  { value: 'st', label: 'st & lb' },
];

export default function HomeScreen() {
  const data = useData();
  const [settings, updateSettings] = useSettings();
  const [state, setState] = useState<HomeState | null>(null);

  // Reload whenever the screen comes back into view (e.g. after onboarding).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const next: HomeState = {
          profile: await getProfile(data),
          activeTargets: await getTargets(data, 'active'),
          pendingTargets: await getTargets(data, 'proposed'),
          activePlan: await getPlan(data, 'active'),
          pendingPlan: await getPlan(data, 'proposed'),
        };
        if (!cancelled) setState(next);
      })();
      return () => {
        cancelled = true;
      };
    }, [data]),
  );

  if (!state || !settings) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Personal Coach' }} />
      </Screen>
    );
  }

  const { profile, activeTargets, pendingTargets, activePlan, pendingPlan } = state;

  if (!profile) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Personal Coach' }} />
        <Text style={type.title}>Hi, I'm your coach 👋</Text>
        <Text style={type.body}>
          Answer a few questions about you, your goal and how you like to train. It takes about 3
          minutes. I'll then suggest daily calorie and macro targets and a starting training plan,
          and explain how I worked them out.
        </Text>
        <Text style={type.body}>Nothing changes until you approve it.</Text>
        <Button title="Get started" onPress={() => router.push('/onboarding')} />
        <Text style={type.muted}>Personal Coach is for adults aged 18 and over.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Personal Coach' }} />

      {(pendingTargets || pendingPlan) && (
        <Card title="Your coach has suggestions">
          <Text style={type.muted}>Review them to put them into effect.</Text>
          {pendingTargets && (
            <Button title="Review targets" onPress={() => router.push('/targets')} />
          )}
          {pendingPlan && <Button title="Review training plan" onPress={() => router.push('/plan')} />}
        </Card>
      )}

      <Card title="Daily targets">
        {activeTargets ? (
          <>
            <MacroSummary values={activeTargets} />
            <Button title="See how these were worked out" variant="secondary" onPress={() => router.push('/targets')} />
          </>
        ) : (
          <Text style={type.muted}>No targets yet. Accept or edit your coach's suggestion first.</Text>
        )}
      </Card>

      <Card title="Training plan">
        {activePlan ? (
          <>
            <Text style={type.body}>{capitalise(activePlan.name)}</Text>
            <View style={styles.days}>
              {activePlan.days.map((day) => (
                <Text key={day.name} style={type.muted}>
                  {day.name}: {day.exercises.length} exercises
                </Text>
              ))}
            </View>
            <Button title="View plan" variant="secondary" onPress={() => router.push('/plan')} />
          </>
        ) : (
          <Text style={type.muted}>No active plan yet.</Text>
        )}
      </Card>

      <Card title="You">
        <Text style={type.muted}>
          {formatWeight(profile.weightKg, settings.weightUnit)} · {profile.heightCm} cm ·{' '}
          {profile.daysPerWeek} training days a week
        </Text>
        <SingleChoice
          label="Show bodyweight in"
          options={UNIT_OPTIONS}
          value={settings.weightUnit}
          onChange={(weightUnit) => updateSettings({ weightUnit })}
        />
        <Button title="Redo onboarding" variant="secondary" onPress={() => router.push('/onboarding')} />
      </Card>

      <Notice>{GP_NOTE}</Notice>
    </Screen>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  days: { gap: spacing.xs },
});
