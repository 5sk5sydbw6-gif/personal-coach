/** Shared design tokens. Keep colours and spacing here, not in screens. */
export const colors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F9FB',
  text: '#14181F',
  textMuted: '#5B6573',
  primary: '#1F6FEB',
  primarySoft: '#E8F0FE',
  onPrimary: '#FFFFFF',
  border: '#D9DEE4',
  danger: '#C62828',
  dangerSoft: '#FDECEA',
  warning: '#8A5A00',
  warningSoft: '#FFF4D6',
  success: '#1E7B34',
  successSoft: '#E6F4EA',
  protein: '#C2410C',
  carbs: '#1F6FEB',
  fat: '#7C3AED',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
};

export const type = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
  muted: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  label: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
};

/** Phone-sized column width, so the laptop browser shows the mobile layout. */
export const MAX_CONTENT_WIDTH = 430;
