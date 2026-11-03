import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WeightUnit } from '@/domain/records';
import { fieldsToWeight, type WeightFields, weightToFields } from '@/domain/units';

import { TextField } from './TextField';
import { colors, spacing } from './theme';

interface Props {
  label: string;
  valueKg: number | undefined;
  unit: WeightUnit;
  onChange: (kg: number | undefined) => void;
  hint?: string;
  error?: string;
}

/**
 * Weight input in the user's chosen unit. Always reports kilograms, so the
 * rest of the app never deals with pounds or stones.
 */
export function WeightField({ label, valueKg, unit, onChange, hint, error }: Props) {
  const [fields, setFields] = useState<WeightFields>(() => weightToFields(valueKg, unit));

  // Re-display the current value when the unit changes.
  useEffect(() => {
    setFields(weightToFields(valueKg, unit));
    // Only on unit change: re-formatting while typing would fight the user.
  }, [unit]);

  function update(next: WeightFields) {
    setFields(next);
    onChange(fieldsToWeight(next, unit));
  }

  if (unit !== 'st') {
    return (
      <TextField
        label={label}
        hint={hint}
        numeric
        value={fields.main}
        onChangeText={(main) => update({ ...fields, main })}
        suffix={unit}
        error={error}
      />
    );
  }
  return (
    <View style={styles.group}>
      <View style={styles.row}>
        <TextField
          label={label}
          hint={hint}
          numeric
          value={fields.main}
          onChangeText={(main) => update({ ...fields, main })}
          suffix="st"
        />
        <View style={styles.lb}>
          <TextField label=" " numeric value={fields.lb} onChangeText={(lb) => update({ ...fields, lb })} suffix="lb" hint={hint ? ' ' : undefined} />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  lb: { flex: 1 },
  error: { fontSize: 14, color: colors.danger },
});
