import { FontSize, Radius, Spacing, createSharedStyles, useTheme } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useCreateHabit, useUpdateHabit } from '../hooks/use-habits';
import { Habit, HabitCategory, HabitFrequency } from '../types/habit';

const CATEGORIES = [
  { label: 'FITNESS',      emoji: '🏃' },
  { label: 'NUTRITION',    emoji: '🥗' },
  { label: 'SLEEP',        emoji: '😴' },
  { label: 'PRODUCTIVITY', emoji: '📚' },
  { label: 'WELLNESS',     emoji: '🧘' },
  { label: 'OTHER',        emoji: '✨' },
];

export default function CreateHabitScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const sharedStyles = createSharedStyles(Colors);
  
  const router = useRouter();

  // if these params are present we are in edit mode
  const params = useLocalSearchParams<{
    habitId?:       string;
    name?:          string;
    habitCategory?: string;
    frequency?:     string;
    visibility?:    string;
  }>();

  const isEditMode = !!params.habitId;

  const EMPTY_HABIT: Habit = {
    id:            params.habitId ?? '1',
    name:          params.name ?? '',
    description:   '',
    habitCategory: (params.habitCategory as HabitCategory) ?? 'FITNESS',
    frequency:     (params.frequency as HabitFrequency) ?? 'DAILY',
    visibility:    params.visibility === 'true',
    active:        true,
    currentStreak: 0,
    priorityRank:  undefined,
    updatedAt:     new Date().toISOString(),
    createdAt:     new Date().toISOString(),
  };

  const [habit, setHabit]           = useState<Habit>(EMPTY_HABIT);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateHabitField = (field: keyof Habit, value: any) => {
    setHabit((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () =>
    setHabit({ ...EMPTY_HABIT, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() });

  // ── Mutations — pick one based on mode ────────────────────────────────────
  const { mutate: createHabit, isPending: isCreating } = useCreateHabit();
  const { mutate: updateHabit, isPending: isUpdating } = useUpdateHabit(params.habitId ?? '');
  const isPending = isCreating || isUpdating;

  const canSubmit = habit.name.trim().length > 0;

  function handleSubmit() {
    setSubmitError(null);

    const payload = {
      name:          habit.name,
      habitCategory: habit.habitCategory,
      frequency:     habit.frequency,
      active:        habit.active,
      visibility:    habit.visibility,
    };

    if (isEditMode) {
      updateHabit(payload, {
        onSuccess: () => setShowSuccess(true),
        onError: (err: any) => {
          setSubmitError(err?.response?.data?.error ?? 'Something went wrong. Please try again.');
        },
      });
    } else {
      createHabit(payload, {
        onSuccess: () => setShowSuccess(true),
        onError: (err: any) => {
          setSubmitError(err?.response?.data?.error ?? 'Something went wrong. Please try again.');
        },
      });
    }
  }

  return (
    <ImageBackground
      source={require('../assets/images/leaf.png')}
      style={styles.background}
      imageStyle={{ opacity: 0.08 }}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={sharedStyles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={sharedStyles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Habit' : 'New Habit'}
            </Text>
            <Text style={styles.headerSub}>
              {isEditMode ? 'update your habit details ✏️' : 'build something that sticks 🌱'}
            </Text>
          </View>

          <View style={styles.leafBadge}>
            <Text style={styles.leafEmoji}>{isEditMode ? '✏️' : '🍃'}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Habit Name */}
          <SectionCard styles={styles}>
            <SectionLabel text="What's your habit?" required styles={styles} />
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Drink 8 glasses of water"
                placeholderTextColor={Colors.lightBrown}
                value={habit.name}
                onChangeText={(text) => { updateHabitField('name', text); setSubmitError(null); }}
                maxLength={60}
                returnKeyType="done"
              />
              <Text style={styles.charCount}>{habit.name.length}/60</Text>
            </View>
          </SectionCard>

          {/* Category */}
          <SectionCard styles={styles}>
            <SectionLabel text="Category" required styles={styles} />
            <View style={styles.pillGrid}>
              {CATEGORIES.map((cat) => {
                const active = habit.habitCategory === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => updateHabitField('habitCategory', cat.label as HabitCategory)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.pillEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Frequency */}
          <SectionCard styles={styles}>
            <SectionLabel text="How often?" styles={styles} />
            <View style={styles.segmentedControl}>
              {(['DAILY', 'WEEKLY'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.segment,
                    habit.frequency === opt && styles.segmentActive,
                    isEditMode && styles.segmentLocked,
                  ]}
                  onPress={() => { if (!isEditMode) updateHabitField('frequency', opt); }}
                  activeOpacity={isEditMode ? 1 : 0.8}
                >
                  <Text style={[styles.segmentLabel, habit.frequency === opt && styles.segmentLabelActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {isEditMode && (
            <View style={styles.freqLockedNote}>
              <Text style={styles.freqLockedNoteText}>
                Frequency cannot be changed after a habit is created. To track at a different frequency, consider creating a new habit.
              </Text>
            </View>
          )}

          {/* Visibility */}
          <SectionCard styles={styles}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <SectionLabel text="Visibility" noMargin styles={styles} />
                <Text style={styles.toggleSub}>
                  {habit.visibility ? 'Friends can see this habit' : 'Only you can see this habit'}
                </Text>
              </View>
              <View style={styles.toggleRight}>
                <Text style={[styles.toggleBadge, habit.visibility ? styles.publicBadge : styles.privateBadge]}>
                  {habit.visibility ? 'Public' : 'Private'}
                </Text>
                <Switch
                  value={habit.visibility}
                  onValueChange={(value) => updateHabitField('visibility', value)}
                  trackColor={{ false: Colors.border, true: Colors.lightGreen }}
                  thumbColor={habit.visibility ? Colors.midGreen : Colors.white}
                  ios_backgroundColor={Colors.border}
                />
              </View>
            </View>
          </SectionCard>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || isPending) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={canSubmit && !isPending ? 0.85 : 1}
            disabled={!canSubmit || isPending}
          >
            {isPending ? (
              <>
                <Text style={styles.submitLeaf}>⏳</Text>
                <Text style={styles.submitLabel}>Saving…</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitLeaf}>{isEditMode ? '💾' : '🍀'}</Text>
                <Text style={styles.submitLabel}>{isEditMode ? 'Save Changes' : 'Add to Habitat'}</Text>
              </>
            )}
          </TouchableOpacity>

          {submitError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️  {submitError}</Text>
            </View>
          )}

          {/* AI nudge — only shown in create mode */}
          {!isEditMode && (
            <TouchableOpacity
              style={styles.aiNudge}
              onPress={() => router.push('/create-habit-ai')}
              activeOpacity={0.75}
            >
              <View style={styles.aiNudgeInner}>
                <Text style={styles.aiNudgeIcon}>✦</Text>
                <View>
                  <Text style={styles.aiNudgeTitle}>Not sure where to start?</Text>
                  <Text style={styles.aiNudgeSub}>Let AI suggest habits based on your goals →</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Success Modal */}
        <Modal
          visible={showSuccess}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccess(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalStrip} />
              <Text style={styles.modalEmoji}>{isEditMode ? '✅' : '🌿'}</Text>
              <Text style={styles.modalTitle}>{isEditMode ? 'Habit Updated!' : 'Habit Added!'}</Text>
              <Text style={styles.modalSub}>
                {isEditMode
                  ? 'Your changes have been saved.'
                  : 'Your new habit is ready to go.\nKeep it up — every streak starts here.'}
              </Text>

              {!isEditMode && (
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  activeOpacity={0.85}
                  onPress={() => { setShowSuccess(false); resetForm(); }}
                >
                  <Text style={styles.modalPrimaryLabel}>＋  Create Another Habit</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={isEditMode ? styles.modalPrimaryBtn : styles.modalSecondaryBtn}
                activeOpacity={0.75}
                onPress={() => {
                  setShowSuccess(false);
                  if (isEditMode) {
                    router.back();
                  } else {
                    router.push('/(tabs)/home');
                  }
                }}
              >
                <Text style={isEditMode ? styles.modalPrimaryLabel : styles.modalSecondaryLabel}>
                  {isEditMode ? 'Back to Habit' : 'Return to Dashboard'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

// Helpers
function SectionCard({ children, styles }: { children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionLabel({
  text, required, noMargin, styles,
}: {
  text: string; required?: boolean; noMargin?: boolean; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.labelRow, noMargin && { marginBottom: 0 }]}>
      <Text style={styles.sectionLabel}>{text}</Text>
      {required && <Text style={styles.requiredDot}> *</Text>}
    </View>
  );
}

const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  background: { flex: 1, backgroundColor: Colors.pageBg },
  safe:       { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.top_margin,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.pageBg,
  },
  // backBtn: {
  //   width: 38, height: 38, borderRadius: Radius.md,
  //   backgroundColor: Colors.cardBg, alignItems: 'center', justifyContent: 'center',
  //   shadowColor: 'rgba(61, 59, 142, 0.08)', shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 1, shadowRadius: Radius.sm, elevation: 3,
  // },
  // backArrow:    { fontSize: FontSize.lg, color: Colors.primaryIndigo, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primaryIndigo, letterSpacing: -0.3 },
  headerSub:    { fontSize: FontSize.xs, color: Colors.lightBrown, marginTop: 1 },
  leafBadge: {
    width: 38, height: 38, borderRadius: Radius.md,
    backgroundColor: Colors.pageBg, alignItems: 'center', justifyContent: 'center',
  },
  leafEmoji: { fontSize: FontSize.lg },
  scroll:    { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
    shadowColor: 'rgba(61, 59, 142, 0.08)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: Radius.md, elevation: 3,
  },
  labelRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.ms },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryIndigo, textTransform: 'uppercase', letterSpacing: 0.8 },
  requiredDot:  { fontSize: FontSize.sm, color: Colors.midIndigo, fontWeight: '700' },
  inputWrapper: {
    backgroundColor: Colors.pageBg, borderRadius: Radius.md, borderWidth: 1.5,
    borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  input:      { fontSize: FontSize.md, color: Colors.darkBrown, minHeight: 28 },
  charCount:  { fontSize: FontSize.xs, color: Colors.lightBrown, textAlign: 'right', marginTop: Spacing.xs },
  pillGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 50,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.pageBg, gap: 6,
  },
  pillActive:      { backgroundColor: Colors.primaryIndigo, borderColor: Colors.primaryIndigo },
  pillEmoji:       { fontSize: FontSize.sm },
  pillLabel:       { fontSize: FontSize.sm, fontWeight: '600', color: Colors.lightBrown },
  pillLabelActive: { color: Colors.white },
  segmentedControl: {
    flexDirection: 'row', backgroundColor: Colors.pageBg, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.xs, gap: 4,
  },
  segment:           { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  segmentActive: {
    backgroundColor: Colors.midGreen, shadowColor: Colors.midGreen,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: Radius.sm, elevation: 2,
  },
  segmentLocked: { opacity: 0.45 },
  freqLockedNote: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.paleIndigo,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentLabel:       { fontSize: FontSize.sm, fontWeight: '600', color: Colors.lightBrown },
  segmentLabelActive: { color: Colors.white },
  freqLockedNoteText: {
    fontSize: FontSize.xs,
    color: Colors.midIndigo,
    lineHeight: 17,
  },
  toggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { flex: 1, gap: 3 },
  toggleSub:  { fontSize: FontSize.xs, color: Colors.lightBrown, marginTop: Spacing.xs },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.ms },
  toggleBadge: {
    fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: Radius.lg, overflow: 'hidden', letterSpacing: 0.4,
  },
  publicBadge:  { backgroundColor: Colors.pageBg, color: Colors.midGreen },
  privateBadge: { backgroundColor: Colors.paleIndigo, color: Colors.midIndigo },
  submitBtn: {
    flexDirection: 'row', backgroundColor: Colors.primaryIndigo, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xs,
    shadowColor: Colors.primaryIndigo, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: Radius.md, elevation: 6,
  },
  submitBtnDisabled: { backgroundColor: Colors.lightGreen, shadowOpacity: 0.1 },
  submitLeaf:        { fontSize: FontSize.lg },
  submitLabel:       { fontSize: FontSize.md, fontWeight: '700', color: Colors.white, letterSpacing: 0.3 },
  errorBanner: {
    marginTop: Spacing.sm, backgroundColor: Colors.white, borderWidth: 1.5,
    borderColor: Colors.danger, borderRadius: Radius.md, paddingVertical: Spacing.ms, paddingHorizontal: Spacing.md,
  },
  errorBannerText: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600', textAlign: 'center' },
  aiNudge: {
    marginTop: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5,
    borderColor: Colors.midIndigo, backgroundColor: Colors.pageBg, padding: Spacing.md,
  },
  aiNudgeInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.ms },
  aiNudgeIcon:  { fontSize: FontSize.xl, color: Colors.midIndigo },
  aiNudgeTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.darkBrown },
  aiNudgeSub:   { fontSize: FontSize.xs, color: Colors.lightBrown, marginTop: Spacing.xs },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(43, 45, 66, 0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%', backgroundColor: Colors.cardBg, borderRadius: Radius.lg,
    alignItems: 'center', overflow: 'hidden',
    shadowColor: Colors.primaryIndigo, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22, shadowRadius: Radius.lg, elevation: 12, paddingBottom: Spacing.lg,
  },
  modalStrip:         { width: '100%', height: 6, backgroundColor: Colors.midGreen, marginBottom: Spacing.lg },
  modalEmoji:         { fontSize: 48, marginBottom: Spacing.sm },
  modalTitle:         { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primaryIndigo, letterSpacing: -0.4, marginBottom: Spacing.sm },
  modalSub: {
    fontSize: FontSize.sm, color: Colors.lightBrown, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: Spacing.md, marginBottom: Spacing.lg,
  },
  modalPrimaryBtn: {
    width: '85%', backgroundColor: Colors.primaryIndigo, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.ms,
    shadowColor: Colors.primaryIndigo, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: Radius.sm, elevation: 5,
  },
  modalPrimaryLabel:   { color: Colors.white, fontSize: FontSize.md, fontWeight: '700', letterSpacing: 0.2 },
  modalSecondaryBtn: {
    width: '85%', borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: Spacing.ms, alignItems: 'center',
  },
  modalSecondaryLabel: { color: Colors.lightBrown, fontSize: FontSize.md, fontWeight: '600' },
});