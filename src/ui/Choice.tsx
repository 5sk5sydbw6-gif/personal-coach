import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from './theme';

export interface Option<T> {
  value: T;
  label: string;
}

interface BaseProps<T> {
  label?: string;
  options: Option<T>[];
  error?: string;
  /** 'list' stacks full-width rows; 'chips' wraps compact buttons. */
  layout?: 'list' | 'chips';
}

/** Pick exactly one option. */
export function SingleChoice<T extends string | number>({
  value,
  onChange,
  ...rest
}: BaseProps<T> & { value: T | undefined; onChange: (value: T) => void }) {
  return (
    <ChoiceGroup {...rest} isSelected={(v) => v === value} onToggle={onChange} role="radio" />
  );
}

/** Pick any number of options. */
export function MultiChoice<T extends string | number>({
  values,
  onChange,
  ...rest
}: BaseProps<T> & { values: T[]; onChange: (values: T[]) => void }) {
  return (
    <ChoiceGroup
      {...rest}
      isSelected={(v) => values.includes(v)}
      onToggle={(v) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])}
      role="checkbox"
    />
  );
}

function ChoiceGroup<T extends string | number>({
  label,
  options,
  error,
  layout = 'chips',
  isSelected,
  onToggle,
  role,
}: BaseProps<T> & {
  isSelected: (v: T) => boolean;
  onToggle: (v: T) => void;
  role: 'radio' | 'checkbox';
}) {
  return (
    <View style={styles.group}>
      {label ? <Text style={type.label}>{label}</Text> : null}
      <View style={layout === 'chips' ? styles.chips : styles.list}>
        {options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole={role}
              accessibilityState={{ checked: selected }}
              onPress={() => onToggle(option.value)}
              style={[
                styles.option,
                layout === 'list' && styles.optionList,
                selected && styles.selected,
              ]}>
              <Text style={[styles.optionText, selected && styles.selectedText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { gap: spacing.sm },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionList: { paddingVertical: 12 },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  optionText: { fontSize: 15, color: colors.text },
  selectedText: { color: colors.primary, fontWeight: '600' },
  error: { fontSize: 14, color: colors.danger },
});
