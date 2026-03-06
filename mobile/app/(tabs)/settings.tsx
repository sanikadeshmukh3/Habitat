import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

// ── Tab definitions ──────────────────────────────────────────
//  ADD NEW TABS HERE: just push another { id, label } object.
//  Then add a matching `case` in renderContent() below.
const TABS = [
  { id: 'general',       label: '⚙️  General'      },
  { id: 'accessibility', label: '♿  Accessibility' },
  // { id: 'notifications', label: '🔔  Notifications' },  ← example
];

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('general');

  // ── General settings state ────────────────────────────────
  //  TO IMPLEMENT theme: pass `theme` into a ThemeContext and
  //  use it to switch Colors.pageBg etc. across the app.
  const [theme, setTheme] = useState<'light' | 'dark' | 'nature'>('light');

  // ── Accessibility settings state ──────────────────────────
  //  TO IMPLEMENT highContrast: in theme.ts add a
  //  `highContrastColors` export; switch Colors import based on
  //  a global context value you set here.
  const [highContrast, setHighContrast] = useState(false);
  const [largeText,    setLargeText]    = useState(false); // bonus setting stub

  // navigation placeholder
  const goBack = () => console.log('Navigate back');

  // ── Content renderer ─────────────────────────────────────
  //  ADD NEW SETTING PANELS HERE by adding cases.
  const renderContent = () => {
    switch (activeTab) {

      // ── General ────────────────────────────────────────────
      case 'general':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.panelTitle}>General</Text>

            <Text style={styles.sectionLabel}>App Theme</Text>
            <Text style={styles.hint}>
              Theme switching is scaffolded – connect to a ThemeContext to activate.
            </Text>

            {/* Theme selector chips */}
            <View style={styles.chipRow}>
              {(['light', 'dark', 'nature'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.themeChip, theme === t && styles.themeChipActive]}
                  onPress={() => {
                    setTheme(t);
                    // TODO: dispatch to ThemeContext
                    console.log('Theme selected:', t);
                  }}
                >
                  <Text style={[styles.themeChipText, theme === t && styles.themeChipTextActive]}>
                    {t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '🌿 Nature'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Stub: add more General settings below this line ── */}
          </ScrollView>
        );

      // ── Accessibility ──────────────────────────────────────
      case 'accessibility':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.panelTitle}>Accessibility</Text>

            {/* High contrast toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>High Contrast</Text>
                <Text style={styles.hint}>
                  Increases text/background contrast.{'\n'}
                  TODO: swap Colors import via a ContrastContext.
                </Text>
              </View>
              <Switch
                value={highContrast}
                onValueChange={v => {
                  setHighContrast(v);
                  // TODO: dispatch to ContrastContext
                  console.log('High contrast:', v);
                }}
                trackColor={{ false: Colors.lightGreen, true: Colors.primaryGreen }}
                thumbColor={highContrast ? Colors.white : Colors.lightBrown}
              />
            </View>

            <View style={styles.divider} />

            {/* Large text toggle (stub) */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Large Text</Text>
                <Text style={styles.hint}>
                  Increases base font size across the app.{'\n'}
                  TODO: multiply FontSize constants via context.
                </Text>
              </View>
              <Switch
                value={largeText}
                onValueChange={v => {
                  setLargeText(v);
                  // TODO: dispatch to FontSizeContext
                  console.log('Large text:', v);
                }}
                trackColor={{ false: Colors.lightGreen, true: Colors.primaryGreen }}
                thumbColor={largeText ? Colors.white : Colors.lightBrown}
              />
            </View>

            {/* ── Stub: add more Accessibility settings below ── */}
          </ScrollView>
        );

      default:
        return <Text style={styles.hint}>Select a tab.</Text>;
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/leaf.png')}
      style={styles.bg}
      imageStyle={{ opacity: 0.06 }}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* ── Main layout: sidebar LEFT + content RIGHT ─────────
          REPOSITION: change `screenRow` flexDirection          */}
      <View style={styles.screenRow}>

        {/* Sidebar */}
        <View style={styles.sidebar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content panel */}
        <View style={styles.contentPanel}>
          {renderContent()}
        </View>

      </View>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: Colors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.sm,
  },
  backBtnText: {
    color: Colors.primaryGreen,
    fontWeight: '600',
    fontSize: FontSize.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.darkBrown,
  },

  // ── Two-column layout ──
  screenRow: {
    flex: 1,
    flexDirection: 'row',  // ← change to 'column' to stack vertically
  },
  sidebar: {
    width: 130,            // ← adjust width of the tab strip
    backgroundColor: Colors.cardBg,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  tabBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: Colors.paleGreen,
    borderLeftColor: Colors.primaryGreen,
  },
  tabLabel: {
    fontSize: FontSize.sm,
    color: Colors.lightBrown,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  contentPanel: {
    flex: 1,
    padding: Spacing.md,
  },

  // ── Content elements ──
  panelTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.medBrown,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.lightBrown,
    marginBottom: Spacing.sm,
    lineHeight: 17,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  themeChip: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.midGreen,
    backgroundColor: Colors.cardBg,
  },
  themeChipActive: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
  },
  themeChipText: {
    fontSize: FontSize.sm,
    color: Colors.primaryGreen,
    fontWeight: '600',
  },
  themeChipTextActive: {
    color: Colors.white,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.darkBrown,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
});