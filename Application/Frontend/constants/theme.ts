// Source of truth: Figma "Design System" page
// https://www.figma.com/design/DzekBPRM1Yl9mPLJu6i15R/ChorePal?node-id=558-3

export const colors = {
  brand: {
    primary: '#FF7A59',
    primarySubtle: '#FFE9E2',
    primaryShadow: '#D9573A',
  },
  text: {
    primary: '#2B2340',
    secondary: '#7A6F8F',
    tertiary: '#B3A9C4',
    inverse: '#FFFFFF',
  },
  icon: {
    primary: '#2B2340',
    secondary: '#7A6F8F',
    inverse: '#FFFFFF',
  },
  surface: {
    white: '#FFFFFF',
    neutral: '#F3E8D4',
    appBackground: '#FFF7E8',
  },
  border: { default: '#F0E4CF' },
  status: {
    success: '#3CC38A', successText: '#1E7A52', successSubtle: '#E1F5EE', successShadow: '#279A69',
    warning: '#FFC940', warningText: '#7A4F00', warningSubtle: '#FFF1C9',
    error: '#E5484D', errorSubtle: '#FDE7E8',
    pending: '#E0A800',
  },
  category: {
    clean: { base: '#FF6FA3', shadow: '#D94C80', subtle: '#FBEAF0' },
    kitchen: { base: '#3CC38A', shadow: '#279A69', subtle: '#E1F5EE' },
    outdoor: { base: '#4DA8F0', shadow: '#2F86CC', subtle: '#E6F1FB' },
    other: { base: '#9B7BF0', shadow: '#7457CF', subtle: '#EFEAFD' },
  },
};

export const spacing = {
  xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const radius = {
  none: 0, small: 14, button: 20, card: 24, medium: 32, large: 48, full: 9999,
};

// fontFamily names match the @expo-google-fonts export names loaded in app/_layout.tsx.
export const typography = {
  h1: { fontFamily: 'Fredoka_700Bold', fontWeight: '700' as const, fontSize: 32, lineHeight: 40 },
  display: { fontFamily: 'Fredoka_700Bold', fontWeight: '700' as const, fontSize: 48, lineHeight: 60 },
  h2: { fontFamily: 'Fredoka_700Bold', fontWeight: '700' as const, fontSize: 24, lineHeight: 32 },
  h3: { fontFamily: 'Fredoka_600SemiBold', fontWeight: '600' as const, fontSize: 20, lineHeight: 28 },
  h4: { fontFamily: 'Fredoka_600SemiBold', fontWeight: '600' as const, fontSize: 18, lineHeight: 28 },
  h5: { fontFamily: 'Fredoka_600SemiBold', fontWeight: '600' as const, fontSize: 16, lineHeight: 24 },
  navLabel: { fontFamily: 'Fredoka_700Bold', fontWeight: '700' as const, fontSize: 16, lineHeight: 16 },
  label: { fontFamily: 'Nunito_800ExtraBold', fontWeight: '800' as const, fontSize: 14, lineHeight: 20 },
  labelSmall: { fontFamily: 'Nunito_800ExtraBold', fontWeight: '800' as const, fontSize: 12, lineHeight: 18 },
  captionStrong: { fontFamily: 'Nunito_800ExtraBold', fontWeight: '800' as const, fontSize: 10, lineHeight: 15 },
  bodyLarge: { fontFamily: 'Nunito_700Bold', fontWeight: '700' as const, fontSize: 18, lineHeight: 28 },
  bodyMedium: { fontFamily: 'Nunito_600SemiBold', fontWeight: '600' as const, fontSize: 16, lineHeight: 24 },
  bodyMediumStrong: { fontFamily: 'Nunito_800ExtraBold', fontWeight: '800' as const, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: 'Nunito_600SemiBold', fontWeight: '600' as const, fontSize: 14, lineHeight: 20 },
  bodySmallStrong: { fontFamily: 'Nunito_800ExtraBold', fontWeight: '800' as const, fontSize: 14, lineHeight: 20 },
  bodyCaption: { fontFamily: 'Nunito_800ExtraBold', fontWeight: '800' as const, fontSize: 10, lineHeight: 15 },
  bodyMeta: { fontFamily: 'Nunito_700Bold', fontWeight: '700' as const, fontSize: 12, lineHeight: 16 },
};
