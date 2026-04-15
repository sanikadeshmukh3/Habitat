import { router } from "expo-router";
import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, FontSize, Radius, Spacing } from '@/constants/theme';
import type { ThemeName } from '@/constants/theme';
import { useUserSettings, useUpdateUserSettings } from '@/hooks/use-user';
import type { AppTheme, UpdateSettingsPayload } from '@/types/user';

const THEME_STORAGE_KEY = '@app_theme';

// ── LOADING STRATEGY ─────────────────────────────────────────────────────────
//
// Settings are loaded in two layers:
//
//  1. App startup  → your root layout (e.g. app/_layout.tsx) calls
//     useUserSettings(userId) once, which fetches from the server and writes
//     into the React Query cache.  That fetch is the only network request.
//
//  2. Settings screen opens  → useUserSettings reads from the in-memory
//     React Query cache instantly (staleTime = 5 min), so the screen renders
//     with zero loading time on subsequent opens.
//
// If you want settings to survive app restarts without a network hit, add the
// @tanstack/query-async-storage-persister package and configure it in your
// QueryClient setup.  The hooks here don't need to change.

export default function SettingsScreen() {

  const { Colors, theme, setTheme } = useTheme();

  // ── Remote data ─────────────────────────────────────────────────────────
  const {
    data:      settings,
    isLoading: settingsLoading,
  } = useUserSettings();

  const { mutate: updateSettings, isPending: isSaving } = useUpdateUserSettings();

  // ── Derived values with safe defaults while loading ──────────────────────
  const habitStacking = settings?.habitStacking ?? false;
  const notifications = settings?.notifications ?? false;

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      if (saved) setTheme(saved as ThemeName);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save a single settings key immediately on change ────────────────────
  const saveSetting = (patch: UpdateSettingsPayload) => {
    updateSettings(patch, {
      onError: (err) => {
        const msg = (err as any)?.response?.data?.error ?? 'Could not save setting.';
        Alert.alert('Save failed', msg);
      },
    });
  };

  const handleThemeChange = async (t: ThemeName) => {
    setTheme(t);                         
    await AsyncStorage.setItem(THEME_STORAGE_KEY, t);
    saveSetting({ theme: t });                       
  };

  const goBack = () => router.push('./(tabs)/home');

  const handleReplayTutorial = () => {
    // TODO: reset your onboarding flag in AsyncStorage, then navigate to the
    //       tutorial screen.
    // e.g. await AsyncStorage.setItem('@tutorialSeen', 'false');
    //      router.replace('./tutorial');
    Alert.alert('Tutorial', 'Replaying tutorial...');
  };
  // ── Dynamic styles ───────────────────────────────────────────────────────
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <ImageBackground
      source={require('../assets/images/leaf.png')}
      style={styles.bg}
      imageStyle={{ opacity: 0.06 }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>

        <View style={styles.savingBadge}>
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color={Colors.primaryGreen} />
              <Text style={styles.savingText}>Saving…</Text>
            </>
          ) : (
            <Text style={styles.savedText}>{settings ? '✓ Saved' : ''}</Text>
          )}
        </View>
      </View>

      {/* ── Settings list ───────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {settingsLoading && !settings ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color={Colors.primaryGreen} />
          </View>
        ) : (
          <>
            {/* ── Section: Appearance ─────────────────────────── */}
            <Text style={styles.sectionLabel}>Appearance</Text>
            <View style={styles.card}>
              <Text style={styles.settingName}>App Theme</Text>
              <View style={styles.chipRow}>
                {(['light', 'dark', 'nature'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.themeChip, theme === t && styles.themeChipActive]}
                    onPress={() => handleThemeChange(t)}
                    disabled={isSaving}
                  >
                    <Text style={[styles.themeChipText, theme === t && styles.themeChipTextActive]}>
                      {t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '🌿 Nature'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Section: Habits ─────────────────────────────── */}
            <Text style={styles.sectionLabel}>Habits</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Habit Stacking</Text>
                  <Text style={styles.hint}>
                    Link habits together so completing one automatically prompts the next.
                  </Text>
                </View>
                <Switch
                  value={habitStacking}
                  onValueChange={v => saveSetting({ habitStacking: v })}
                  trackColor={{ false: Colors.lightGreen, true: Colors.primaryGreen }}
                  thumbColor={habitStacking ? Colors.white : Colors.lightBrown}
                  disabled={isSaving}
                />
              </View>
            </View>

            {/* ── Section: General ────────────────────────────── */}
            <Text style={styles.sectionLabel}>General</Text>
            <View style={styles.card}>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Notifications</Text>
                  <Text style={styles.hint}>
                    Receive reminders and updates for your habits.
                  </Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={v => saveSetting({ notifications: v })}
                  trackColor={{ false: Colors.lightGreen, true: Colors.primaryGreen }}
                  thumbColor={notifications ? Colors.white : Colors.lightBrown}
                  disabled={isSaving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Replay Tutorial</Text>
                  <Text style={styles.hint}>Walk through the app introduction again.</Text>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={handleReplayTutorial}>
                  <Text style={styles.actionBtnText}>Replay</Text>
                </TouchableOpacity>
              </View>

            </View>
          </>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

// ── makeStyles ────────────────────────────────────────────────────────────────
// Accepts the current ColorScheme and returns a fresh StyleSheet.
// Called inside useMemo so it only re-runs when the theme actually changes.
const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) =>
  StyleSheet.create({
    bg: {
      flex: 1,
      backgroundColor: Colors.pageBg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      paddingTop: Spacing.lg * 2,
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
      flex: 1,
    },
    savingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minWidth: 64,
      justifyContent: 'flex-end',
    },
    savingText: {
      fontSize: FontSize.xs,
      color: Colors.primaryGreen,
      fontWeight: '500',
    },
    savedText: {
      fontSize: FontSize.xs,
      color: Colors.midGreen,
      fontWeight: '500',
    },
    loadingRow: {
      marginTop: Spacing.xl,
      alignItems: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.md,
      paddingBottom: Spacing.lg * 2,
    },
    sectionLabel: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: Colors.medBrown,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
      marginLeft: Spacing.xs,
    },
    card: {
      backgroundColor: Colors.cardBg,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
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
    hint: {
      fontSize: FontSize.xs,
      color: Colors.lightBrown,
      lineHeight: 17,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.border,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
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
    actionBtn: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      backgroundColor: Colors.paleGreen,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: Colors.midGreen,
    },
    actionBtnText: {
      color: Colors.primaryGreen,
      fontWeight: '600',
      fontSize: FontSize.sm,
    },
  });