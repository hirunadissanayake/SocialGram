export const palette = {
  background: '#0A0E1A',
  backgroundGradientStart: '#0A0E1A',
  backgroundGradientEnd: '#1A1F2E',
  surface: '#141824',
  surfaceAlt: '#1E2433',
  surfaceElevated: '#252B3D',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  secondary: '#8B5CF6',
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textDisabled: '#6B7280',
  border: '#1F2937',
  borderLight: '#374151',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shimmer: '#374151',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: palette.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: palette.text,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: palette.text,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: palette.textSecondary,
  },
  body: {
    fontSize: 15,
    color: palette.text,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: palette.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

export const shadows = {
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
};

export const theme = {
  palette,
  spacing,
  radii,
  typography,
  shadows,
};
