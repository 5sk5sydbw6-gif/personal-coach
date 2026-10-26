import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useData } from '@/data/DataProvider';
import { getOrCreateSettings } from '@/data/settingsRepository';
import type { Settings, WeightUnit } from '@/domain/records';
import { formatWeight } from '@/domain/units';
import { Screen } from '@/ui/Screen';
import { colors, spacing } from '@/ui/theme';

const UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
  { value: 'st', label: 'st & lb' },
];

const EXAMPLE_WEIGHT_KG = 80;

/**
 * Phase 0 placeholder. Proves the app runs and that storage persists:
 * pick a unit, refresh the page, and the choice is still selected.
 */
export default function HomeScreen() {
  const data = useData();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getOrCreateSettings(data.settings).then(setSettings);
  }, [data]);

  async function chooseUnit(weightUnit: WeightUnit) {
    if (!settings) return;
    setSettings(await data.settings.update(settings.id, { weightUnit }));
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Personal Coach' }} />
      <Text style={styles.title}>Phase 0: setup complete</Text>
      <Text style={styles.body}>
        The app, storage layer and tests are in place. Features start in Phase 1.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Storage check</Text>
        <Text style={styles.body}>
          Choose a bodyweight unit, then refresh the page. Your choice should still be selected.
        </Text>
        <View style={styles.segmented}>
          {UNITS.map(({ value, label }) => {
            const selected = settings?.weightUnit === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => chooseUnit(value)}
                style={[styles.segment, selected && styles.segmentSelected]}>
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {settings && (
          <Text style={styles.body}>
            {EXAMPLE_WEIGHT_KG} kg shows as{' '}
            <Text style={styles.strong}>{formatWeight(EXAMPLE_WEIGHT_KG, settings.weightUnit)}</Text>
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, lineHeight: 22, color: colors.textMuted },
  strong: { fontWeight: '700', color: colors.text },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 16, color: colors.text },
  segmentTextSelected: { color: colors.onPrimary, fontWeight: '600' },
});
