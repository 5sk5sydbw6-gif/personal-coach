import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type ScrollViewInstance, StyleSheet, Text, View } from 'react-native';

import { completeOnboarding, getActiveGoal, getProfile } from '@/data/coachWorkflow';
import { useCoach, useData } from '@/data/DataProvider';
import {
  answersFromProfile,
  DAYS_PER_WEEK_OPTIONS,
  EMPTY_ANSWERS,
  goalUsesTargetWeight,
  MEALS_PER_DAY_OPTIONS,
  type OnboardingAnswers,
  ONBOARDING_STEPS,
  type OnboardingStep,
  SESSION_MINUTE_OPTIONS,
  type StepErrors,
  validateStep,
} from '@/domain/onboarding';
import {
  ACTIVITY_LABELS,
  DIET_LABELS,
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  type FormulaSex,
  GOAL_LABELS,
  INJURY_LABELS,
  type Sex,
} from '@/domain/profile';
import type { WeightUnit } from '@/domain/records';
import { GP_NOTE, PHYSIO_NOTE } from '@/domain/safety';
import { Button } from '@/ui/Button';
import { MultiChoice, type Option, SingleChoice } from '@/ui/Choice';
import { Notice } from '@/ui/Notice';
import { NumberField } from '@/ui/NumberField';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { colors, spacing, type } from '@/ui/theme';
import { useSettings } from '@/ui/useSettings';
import { WeightField } from '@/ui/WeightField';

const STEP_TITLES: Record<OnboardingStep, string> = {
  basics: 'About you',
  goal: 'Your goal',
  training: 'Your training',
  food: 'Your food',
};

const MONTHS: Option<number>[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
  (label, i) => ({ value: i + 1, label }),
);

const SEX_OPTIONS: Option<Sex>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other / prefer not to say' },
];

const FORMULA_OPTIONS: Option<FormulaSex>[] = [
  { value: 'average', label: 'Average of both (recommended)' },
  { value: 'male', label: 'Male formula' },
  { value: 'female', label: 'Female formula' },
];

const UNIT_OPTIONS: Option<WeightUnit>[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
  { value: 'st', label: 'st & lb' },
];

const YES_NO: Option<'yes' | 'no'>[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

function optionsFrom<T extends string>(labels: Record<T, string>): Option<T>[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export default function OnboardingScreen() {
  const data = useData();
  const coach = useCoach();
  const [settings, updateSettings] = useSettings();
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const today = useMemo(() => new Date(), []);
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Pre-fill from the saved profile when redoing onboarding.
  useEffect(() => {
    (async () => {
      const profile = await getProfile(data);
      setAnswers(profile ? answersFromProfile(profile, await getActiveGoal(data)) : EMPTY_ANSWERS);
    })();
  }, [data]);

  if (!answers || !settings) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Get started' }} />
      </Screen>
    );
  }

  const step = ONBOARDING_STEPS[stepIndex];
  const errors = validateStep(step, answers, today);
  const shown: StepErrors = showErrors ? errors : {};
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  const set = (changes: Partial<OnboardingAnswers>) => setAnswers({ ...answers, ...changes });

  async function next() {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (!isLast) {
      setStepIndex(stepIndex + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    setSaving(true);
    try {
      await completeOnboarding(data, coach, answers!, today);
      router.replace('/targets');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  function back() {
    setShowErrors(false);
    if (stepIndex === 0) router.back();
    else setStepIndex(stepIndex - 1);
  }

  return (
    <Screen scrollRef={scrollRef}>
      <Stack.Screen options={{ title: 'Get started' }} />
      <Text style={type.muted}>
        Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
      </Text>
      <View style={styles.progress}>
        {ONBOARDING_STEPS.map((s, i) => (
          <View key={s} style={[styles.progressBar, i <= stepIndex && styles.progressDone]} />
        ))}
      </View>
      <Text style={type.title}>{STEP_TITLES[step]}</Text>

      {step === 'basics' && (
        <>
          <NumberField
            label="Year you were born"
            placeholder="e.g. 2003"
            value={answers.birthYear}
            onChange={(birthYear) => set({ birthYear })}
            error={shown.birthYear}
          />
          <SingleChoice
            label="Month you were born"
            options={MONTHS}
            value={answers.birthMonth}
            onChange={(birthMonth) => set({ birthMonth })}
            error={shown.birthMonth}
          />
          {errors.age && <Notice tone="danger">{errors.age}</Notice>}
          <SingleChoice
            label="Sex"
            layout="list"
            options={SEX_OPTIONS}
            value={answers.sex}
            onChange={(sex) => set({ sex, formulaSex: sex === 'other' ? (answers.formulaSex ?? 'average') : sex })}
            error={shown.sex}
          />
          {answers.sex === 'other' && (
            <>
              <Text style={type.muted}>
                The calorie formula has separate versions for male and female bodies. Pick the one
                that fits you best, or use the average.
              </Text>
              <SingleChoice
                label="Which formula should the coach use?"
                layout="list"
                options={FORMULA_OPTIONS}
                value={answers.formulaSex}
                onChange={(formulaSex) => set({ formulaSex })}
                error={shown.formulaSex}
              />
            </>
          )}
          <NumberField
            label="Height"
            suffix="cm"
            value={answers.heightCm}
            onChange={(heightCm) => set({ heightCm })}
            error={shown.heightCm}
          />
          <SingleChoice
            label="Show bodyweight in"
            options={UNIT_OPTIONS}
            value={settings.weightUnit}
            onChange={(weightUnit) => updateSettings({ weightUnit })}
          />
          <WeightField
            label="Current weight"
            unit={settings.weightUnit}
            valueKg={answers.weightKg}
            onChange={(weightKg) => set({ weightKg })}
            error={shown.weightKg}
          />
          <SingleChoice
            label="How active are you outside the gym?"
            layout="list"
            options={optionsFrom(ACTIVITY_LABELS)}
            value={answers.activityLevel}
            onChange={(activityLevel) => set({ activityLevel })}
            error={shown.activityLevel}
          />
          <SingleChoice
            label="Do you have a medical condition that affects diet or exercise, or are you pregnant or breastfeeding?"
            options={YES_NO}
            value={answers.healthFlag ? 'yes' : 'no'}
            onChange={(v) => set({ healthFlag: v === 'yes' })}
          />
          {answers.healthFlag && (
            <Notice tone="warning">
              {`${GP_NOTE} The coach won't set a calorie deficit for you.`}
            </Notice>
          )}
        </>
      )}

      {step === 'goal' && (
        <>
          <SingleChoice
            label="What's your main goal?"
            layout="list"
            options={optionsFrom(GOAL_LABELS)}
            value={answers.goalType}
            onChange={(goalType) => set({ goalType })}
            error={shown.goalType}
          />
          {goalUsesTargetWeight(answers.goalType) && (
            <>
              <Text style={type.label}>Target (optional)</Text>
              <Text style={type.muted}>
                Leave these blank and the coach will pick a steady, safe pace. If your timeframe
                is too fast, the coach will slow it down to a safe rate and tell you.
              </Text>
              <WeightField
                label="Target weight"
                unit={settings.weightUnit}
                valueKg={answers.targetWeightKg}
                onChange={(targetWeightKg) => set({ targetWeightKg })}
                error={shown.targetWeightKg}
              />
              <NumberField
                label="Timeframe"
                suffix="weeks"
                value={answers.timeframeWeeks}
                onChange={(timeframeWeeks) => set({ timeframeWeeks })}
                error={shown.timeframeWeeks}
              />
            </>
          )}
        </>
      )}

      {step === 'training' && (
        <>
          <SingleChoice
            label="Training experience"
            layout="list"
            options={optionsFrom(EXPERIENCE_LABELS)}
            value={answers.experience}
            onChange={(experience) => set({ experience })}
            error={shown.experience}
          />
          <SingleChoice
            label="Days a week you can train"
            options={DAYS_PER_WEEK_OPTIONS.map((d) => ({ value: d, label: String(d) }))}
            value={answers.daysPerWeek}
            onChange={(daysPerWeek) => set({ daysPerWeek })}
            error={shown.daysPerWeek}
          />
          <SingleChoice
            label="Session length"
            options={SESSION_MINUTE_OPTIONS.map((m) => ({ value: m, label: `${m} min` }))}
            value={answers.sessionMinutes}
            onChange={(sessionMinutes) => set({ sessionMinutes })}
            error={shown.sessionMinutes}
          />
          <SingleChoice
            label="Equipment"
            layout="list"
            options={optionsFrom(EQUIPMENT_LABELS)}
            value={answers.equipment}
            onChange={(equipment) => set({ equipment })}
            error={shown.equipment}
          />
          <MultiChoice
            label="Any injuries or areas to go easy on?"
            options={optionsFrom(INJURY_LABELS)}
            values={answers.injuries}
            onChange={(injuries) => set({ injuries })}
          />
          <TextField
            label="Anything else about injuries or limitations? (optional)"
            multiline
            value={answers.injuryNotes}
            onChangeText={(injuryNotes) => set({ injuryNotes })}
          />
          {(answers.injuries.length > 0 || answers.injuryNotes.trim() !== '') && (
            <Notice tone="warning">{`The coach will avoid exercises that load the areas you ticked. ${PHYSIO_NOTE}`}</Notice>
          )}
        </>
      )}

      {step === 'food' && (
        <>
          <MultiChoice
            label="Dietary preferences (optional)"
            options={optionsFrom(DIET_LABELS)}
            values={answers.dietaryPreferences}
            onChange={(dietaryPreferences) => set({ dietaryPreferences })}
          />
          <TextField
            label="Foods to avoid (optional)"
            placeholder="e.g. mushrooms, peanuts"
            multiline
            value={answers.foodsToAvoid}
            onChangeText={(foodsToAvoid) => set({ foodsToAvoid })}
          />
          <SingleChoice
            label="Meals a day"
            options={MEALS_PER_DAY_OPTIONS.map((m) => ({ value: m, label: String(m) }))}
            value={answers.mealsPerDay}
            onChange={(mealsPerDay) => set({ mealsPerDay })}
            error={shown.mealsPerDay}
          />
          <Text style={type.muted}>These will be used when food logging arrives.</Text>
        </>
      )}

      {showErrors && Object.keys(errors).length > 0 && (
        <Notice tone="danger">Please fix the highlighted answers above.</Notice>
      )}
      {saveError && <Notice tone="danger">{`Something went wrong: ${saveError}`}</Notice>}

      <View style={styles.nav}>
        <View style={styles.navButton}>
          <Button title="Back" variant="secondary" onPress={back} />
        </View>
        <View style={styles.navButton}>
          <Button
            title={isLast ? 'See my suggestions' : 'Next'}
            onPress={next}
            disabled={saving || Boolean(errors.age)}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: spacing.xs },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDone: { backgroundColor: colors.primary },
  nav: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  navButton: { flex: 1 },
});
