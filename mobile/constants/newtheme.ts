import { createContext, useContext, useState, createElement } from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

// ── Color palette type ─────────────────────────────────────────
export type ColorScheme = {
  pageBg:       string;
  cardBg:       string;
  inputBg:      string;
  primaryGreen: string;
  midGreen:     string;
  lightGreen:   string;
  paleGreen:    string;
  darkBrown:    string;
  medBrown:     string;
  lightBrown:   string;
  white:        string;
  danger:       string;
  badgeGold:    string;
  overlay:      string;
  border:       string;
};

// ── Light theme ────────────────────────────────────────────────
const lightColors: ColorScheme = {
  pageBg:       '#EAF6E8',
  cardBg:       '#FFFFFF',
  inputBg:      '#F4FBF4',
  primaryGreen: '#2E6F40',
  midGreen:     '#4C9A67',
  lightGreen:   '#A8D5BA',
  paleGreen:    '#CDECCD',
  darkBrown:    '#3B2A1A',
  medBrown:     '#5C3D22',
  lightBrown:   '#8B6344',
  white:        '#FFFFFF',
  danger:       '#C0392B',
  badgeGold:    '#D4AC0D',
  overlay:      'rgba(0,0,0,0.35)',
  border:       '#C5E0C5',
};

// ── Dark theme ─────────────────────────────────────────────────
const darkColors: ColorScheme = {
  pageBg:       '#121A14',
  cardBg:       '#1E2E21',
  inputBg:      '#16231A',
  primaryGreen: '#5DBE7A',
  midGreen:     '#3D8A57',
  lightGreen:   '#2A5C3A',
  paleGreen:    '#1A3322',
  darkBrown:    '#E8D5C0',
  medBrown:     '#C4A882',
  lightBrown:   '#8A7060',
  white:        '#F0F0F0',
  danger:       '#E05A4A',
  badgeGold:    '#E8C43A',
  overlay:      'rgba(0,0,0,0.6)',
  border:       '#2A4A32',
};

// ── Nature theme ───────────────────────────────────────────────
const natureColors: ColorScheme = {
  pageBg:       '#F5F0E8',
  cardBg:       '#FDFAF4',
  inputBg:      '#F0EBE0',
  primaryGreen: '#4A7C3F',
  midGreen:     '#6B9E5E',
  lightGreen:   '#B8CFA8',
  paleGreen:    '#DDE8D0',
  darkBrown:    '#2C1F0E',
  medBrown:     '#6B4A2A',
  lightBrown:   '#9C7A52',
  white:        '#FDFAF4',
  danger:       '#B84A30',
  badgeGold:    '#C8960C',
  overlay:      'rgba(20,10,0,0.40)',
  border:       '#CCC5A8',
};

// ── Theme registry ─────────────────────────────────────────────
// To add a new theme: add its ColorScheme object above, register
// it here, and add its name to ThemeName below.
export type ThemeName = 'light' | 'dark' | 'nature';

const THEMES: Record<ThemeName, ColorScheme> = {
  light:  lightColors,
  dark:   darkColors,
  nature: natureColors,
};

// ── Static fallback export ─────────────────────────────────────
// Screens that haven't been wired to useTheme() yet can still
// do `import { Colors } from './theme'` and get the light theme.
// Replace that import with useTheme() per-screen as you go.
export let Colors: ColorScheme = lightColors;

// ── Context ────────────────────────────────────────────────────
type ThemeContextType = {
  theme:    ThemeName;
  Colors:   ColorScheme;
  setTheme: (t: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme:    'light',
  Colors:   lightColors,
  setTheme: () => {},
});

// ── ThemeProvider ──────────────────────────────────────────────
// Place this once around your navigation root in App.tsx.
// Note: uses createElement instead of JSX so this file stays .ts
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    Colors = THEMES[t]; // keeps the static export in sync
  };

  return createElement(
    ThemeContext.Provider,
    { value: { theme, Colors: THEMES[theme], setTheme } },
    children,
  );
}

// ── useTheme hook ──────────────────────────────────────────────
// Call inside any screen component to get the live Colors object
// and the setTheme dispatcher.
//
//   const { Colors, theme, setTheme } = useTheme();
//
export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

// ── Typography ─────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
}) as { sans: string; serif: string; rounded: string; mono: string };

export const FontSize = {
  xs:  11,
  sm:  13,
  md:  15,
  lg:  18,
  xl:  22,
  xxl: 28,
} as const;

export const Radius = {
  sm:   8,
  md:   14,
  lg:   20,
  full: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 36,
} as const;