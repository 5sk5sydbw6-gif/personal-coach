import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, type } from './theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  numeric?: boolean;
  multiline?: boolean;
}

export function TextField({
  label,
  value,
  onChangeText,
  suffix,
  placeholder,
  hint,
  error,
  numeric = false,
  multiline = false,
}: Props) {
  return (
    <View style={styles.group}>
      <Text style={type.label}>{label}</Text>
      {hint ? <Text style={type.muted}>{hint}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          inputMode={numeric ? 'decimal' : 'text'}
          multiline={multiline}
          style={[styles.input, multiline && styles.multiline]}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs, flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text, minWidth: 0 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  suffix: { marginLeft: spacing.sm, fontSize: 16, color: colors.textMuted },
  error: { fontSize: 14, color: colors.danger },
});
