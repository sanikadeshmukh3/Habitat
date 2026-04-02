import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ImageBackground,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCreateHabit, useUpdateHabit } from '../hooks/use-habits';
import { Habit, HabitCategory, HabitFrequency } from '../types/habit';

// Palette
const C = {
  bg:            '#F7FAF5',
  card:          '#FFFFFF',
  sage:          '#7BAE7F',
  sageMid:       '#A8C5A0',
  sagePale:      '#E3F0E1',
  yellow:        '#F5E6A3',
  yellowDeep:    '#E8C84A',
  indigo:        '#3D3B8E',
  indigoPale:    '#EEEDF8',
  indigoMid:     '#6C63FF',
  textPrimary:   '#2B2D42',
  textSecondary: '#6B7280',
  border:        '#E4EDE2',
  shadow:        'rgba(61, 59, 142, 0.08)',
};

const CATEGORIES = [
  { label: 'FITNESS',      emoji: '🏃' },
  { label: 'NUTRITION',    emoji: '🥗' },
  { label: 'SLEEP',        emoji: '😴' },
  { label: 'PRODUCTIVITY', emoji: '📚' },
  { label: 'WELLNESS',     emoji: '🧘' },
  { label: 'OTHER',        emoji: '✨' },
];

export default function CreateHabitScreen() {
  const router = useRouter();

  // If these params are present we are in edit mode
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
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
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
          <SectionCard>
            <SectionLabel text="What's your habit?" required />
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Drink 8 glasses of water"
                placeholderTextColor={C.textSecondary}
                value={habit.name}
                onChangeText={(text) => { updateHabitField('name', text); setSubmitError(null); }}
                maxLength={60}
                returnKeyType="done"
              />
              <Text style={styles.charCount}>{habit.name.length}/60</Text>
            </View>
          </SectionCard>

          {/* Category */}
          <SectionCard>
            <SectionLabel text="Category" required />
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
          <SectionCard>
            <SectionLabel text="How often?" />
            <View style={styles.segmentedControl}>
              {(['DAILY', 'WEEKLY'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.segment, habit.frequency === opt && styles.segmentActive]}
                  onPress={() => updateHabitField('frequency', opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentLabel, habit.frequency === opt && styles.segmentLabelActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* Visibility */}
          <SectionCard>
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <SectionLabel text="Visibility" noMargin />
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
                  trackColor={{ false: C.border, true: C.sageMid }}
                  thumbColor={habit.visibility ? C.sage : '#f0f0f0'}
                  ios_backgroundColor={C.border}
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
function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionLabel({
  text, required, noMargin,
}: {
  text: string; required?: boolean; noMargin?: boolean;
}) {
  return (
    <View style={[styles.labelRow, noMargin && { marginBottom: 0 }]}>
      <Text style={styles.sectionLabel}>{text}</Text>
      {required && <Text style={styles.requiredDot}> *</Text>}
    </View>
  );
}

// Styles — unchanged from original
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#EAF6E8' },
  safe:       { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 16,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 3,
  },
  backArrow:    { fontSize: 18, color: C.indigo, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 20, fontWeight: '700', color: C.indigo, letterSpacing: -0.3 },
  headerSub:    { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  leafBadge: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.sagePale, alignItems: 'center', justifyContent: 'center',
  },
  leafEmoji: { fontSize: 18 },
  scroll:    { paddingHorizontal: 20, paddingTop: 8 },
  card: {
    backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  labelRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: C.indigo, textTransform: 'uppercase', letterSpacing: 0.8 },
  requiredDot:  { fontSize: 14, color: C.indigoMid, fontWeight: '700' },
  inputWrapper: {
    backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10,
  },
  input:      { fontSize: 16, color: C.textPrimary, minHeight: 28 },
  charCount:  { fontSize: 11, color: C.textSecondary, textAlign: 'right', marginTop: 4 },
  pillGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, gap: 6,
  },
  pillActive:      { backgroundColor: C.indigo, borderColor: C.indigo },
  pillEmoji:       { fontSize: 14 },
  pillLabel:       { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  pillLabelActive: { color: '#FFFFFF' },
  segmentedControl: {
    flexDirection: 'row', backgroundColor: C.bg, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, padding: 4, gap: 4,
  },
  segment:           { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentActive: {
    backgroundColor: C.sage, shadowColor: C.sage,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 2,
  },
  segmentLabel:       { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  segmentLabelActive: { color: '#FFFFFF' },
  toggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { flex: 1, gap: 3 },
  toggleSub:  { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleBadge: {
    fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, overflow: 'hidden', letterSpacing: 0.4,
  },
  publicBadge:  { backgroundColor: C.sagePale, color: C.sage },
  privateBadge: { backgroundColor: C.indigoPale, color: C.indigoMid },
  submitBtn: {
    flexDirection: 'row', backgroundColor: C.indigo, borderRadius: 18,
    paddingVertical: 17, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
    shadowColor: C.indigo, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  submitBtnDisabled: { backgroundColor: C.sageMid, shadowOpacity: 0.1 },
  submitLeaf:        { fontSize: 18 },
  submitLabel:       { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  errorBanner: {
    marginTop: 10, backgroundColor: '#FFF0F0', borderWidth: 1.5,
    borderColor: '#F5C2C2', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
  },
  errorBannerText: { fontSize: 13, color: '#C0392B', fontWeight: '600', textAlign: 'center' },
  aiNudge: {
    marginTop: 14, borderRadius: 16, borderWidth: 1.5,
    borderColor: C.yellow, backgroundColor: '#FEFDF5', padding: 14,
  },
  aiNudgeInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiNudgeIcon:  { fontSize: 22, color: C.yellowDeep },
  aiNudgeTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  aiNudgeSub:   { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(43, 45, 66, 0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%', backgroundColor: C.card, borderRadius: 28,
    alignItems: 'center', overflow: 'hidden',
    shadowColor: C.indigo, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22, shadowRadius: 24, elevation: 12, paddingBottom: 28,
  },
  modalStrip:         { width: '100%', height: 6, backgroundColor: C.sage, marginBottom: 24 },
  modalEmoji:         { fontSize: 48, marginBottom: 8 },
  modalTitle:         { fontSize: 24, fontWeight: '800', color: C.indigo, letterSpacing: -0.4, marginBottom: 8 },
  modalSub: {
    fontSize: 14, color: C.textSecondary, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 20, marginBottom: 28,
  },
  modalPrimaryBtn: {
    width: '85%', backgroundColor: C.indigo, borderRadius: 16,
    paddingVertical: 15, alignItems: 'center', marginBottom: 12,
    shadowColor: C.indigo, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  modalPrimaryLabel:   { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  modalSecondaryBtn: {
    width: '85%', borderWidth: 1.5, borderColor: C.border,
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  modalSecondaryLabel: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
});