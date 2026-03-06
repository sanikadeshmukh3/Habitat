/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },

  // --- Backgrounds ---
  pageBg:        "#EAF6E8",   // very light green page background
  cardBg:        "#FFFFFF",   // white cards / panels
  inputBg:       "#F4FBF4",   // light-green input fields

  // --- Brand greens ---
  primaryGreen:  "#2E6F40",   // dark forest green  (buttons, headers)
  midGreen:      "#4C9A67",   // medium green        (accents, borders)
  lightGreen:    "#A8D5BA",   // soft green          (tags, toggles)
  paleGreen:     "#CDECCD",   // very pale green     (points box, chips)

  // --- Browns (text & borders) ---
  darkBrown:     "#3B2A1A",   // darkest text
  medBrown:      "#5C3D22",   // section titles, labels
  lightBrown:    "#8B6344",   // secondary text, placeholders

  // --- Utility ---
  white:         "#FFFFFF",
  danger:        "#C0392B",   // error / private badge
  badgeGold:     "#D4AC0D",   // badge icon colour
  overlay:       "rgba(0,0,0,0.35)",  // modal backdrop

  // --- Borders ---
  border:        "#C5E0C5",   // subtle dividers
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   18,
  xl:   22,
  xxl:  28,
};

export const Radius = {
  sm:  8,
  md:  14,
  lg:  20,
  full: 999,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  36,
};