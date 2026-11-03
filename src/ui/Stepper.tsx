import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from './theme';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}

/** A compact − value + control for small whole numbers like sets and reps. */
export function Stepper({ label, value, onChange, min, max }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <StepButton text="−" label={`Decrease ${label}`} disabled={value <= min} onPress={() => onChange(value - 1)} />
      <Text style={styles.value}>{value}</Text>
      <StepButton text="+" label={`Increase ${label}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
    </View>
  );
}

function StepButton({
  text,
  label,
  disabled,
  onPress,
}: {
  text: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 14, color: colors.textMuted, minWidth: 72 },
  value: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center', color: colors.text },
  button: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: { opacity: 0.3 },
  buttonText: { fontSize: 18, color: colors.text },
});
