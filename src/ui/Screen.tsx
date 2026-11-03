import type { ReactNode, RefObject } from 'react';
import { ScrollView, type ScrollViewInstance, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, MAX_CONTENT_WIDTH, spacing } from './theme';

/**
 * Wraps every screen in a phone-width column. On a phone it fills the
 * screen; on a laptop it is centred with the background either side.
 */
export function Screen({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef?: RefObject<ScrollViewInstance | null>;
}) {
  return (
    <View style={styles.outer}>
      <SafeAreaView style={styles.column} edges={['bottom', 'left', 'right']}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
