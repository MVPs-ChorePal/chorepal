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
  shadow: { ledge: '#EADBC1' },
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

// Shared per-screen frame — every screen's background + outer margins.
// Applied once via Stack/Tabs contentStyle/sceneContainerStyle in the *_layout.tsx
// files, so individual screens never need to define their own "container" style.
export const screen = {
  flex: 1,
  backgroundColor: colors.surface.appBackground,
  paddingTop: spacing.xl,
  paddingHorizontal: spacing.xxl,
  // clears the floating tab bar (height: 100, absolutely positioned in both
  // (parent)/_layout.tsx and (child)/_layout.tsx) - without this, anything
  // near the bottom of a tab screen (e.g. the logout button on account.tsx)
  // renders underneath it and is both hidden and untappable.
  paddingBottom: 130,
};

// fontFamily names match the @expo-google-fonts export names loaded in app/_layout.tsx.
export const typography = {
  display: { fontFamily: 'Fredoka_700Bold', fontWeight: '700' as const, fontSize: 32, color: colors.text.primary},
  h2: { fontFamily: 'Fredoka_700Bold', fontWeight: '700' as const, fontSize: 24, color: colors.text.primary},
  h3: { fontFamily: 'Fredoka_700Bold', fontWeight: '700' as const, fontSize: 20, color: colors.text.primary},
  body: { fontFamily: 'Nunito_700Bold', fontWeight: '700' as const, fontSize: 16, color: colors.text.primary},
  bodySecondary: { fontFamily: 'Nunito_700Bold', fontWeight: '700' as const, fontSize: 16, color: colors.text.secondary},
  bodyTertiary: { fontFamily: 'Nunito_700Bold', fontWeight: '700' as const, fontSize: 16, color: colors.text.tertiary},
};
