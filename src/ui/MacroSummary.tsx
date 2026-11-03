import { StyleSheet, Text, View } from 'react-native';

import type { TargetValues } from '@/domain/safety';
import { fmt } from '@/domain/format';

import { colors, radius, spacing } from './theme';

/** Calories plus a row of protein / carbs / fat. */
export function MacroSummary({ values }: { values: TargetValues }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.kcalRow}>
        <Text style={styles.kcal}>{fmt(values.calories)}</Text>
        <Text style={styles.kcalUnit}>kcal a day</Text>
      </View>
      <View style={styles.macros}>
        <Macro label="Protein" grams={values.proteinG} color={colors.protein} />
        <Macro label="Carbs" grams={values.carbsG} color={colors.carbs} />
        <Macro label="Fat" grams={values.fatG} color={colors.fat} />
      </View>
    </View>
  );
}

function Macro({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={styles.macro}>
      <Text style={[styles.grams, { color }]}>{grams} g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  kcal: { fontSize: 36, fontWeight: '700', color: colors.text },
  kcalUnit: { fontSize: 16, color: colors.textMuted },
  macros: { flexDirection: 'row', gap: spacing.sm },
  macro: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  grams: { fontSize: 20, fontWeight: '700' },
  macroLabel: { fontSize: 13, color: colors.textMuted },
});
