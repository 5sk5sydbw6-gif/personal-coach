import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from './theme';

type Tone = 'info' | 'warning' | 'danger' | 'success';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: colors.primarySoft, fg: colors.text },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  success: { bg: colors.successSoft, fg: colors.success },
};

/** A coloured message box for coach notes, warnings and errors. */
export function Notice({ tone = 'info', children }: { tone?: Tone; children: string }) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.box, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: spacing.md, borderRadius: radius.sm },
  text: { fontSize: 15, lineHeight: 21 },
});
