import React, { useState } from 'react';
import {
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

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:           '#F7FAF5',   // warm off-white with a hint of sage
  card:         '#FFFFFF',
  sage:         '#7BAE7F',   // primary green
  sageMid:      '#A8C5A0',
  sagePale:     '#E3F0E1',
  yellow:       '#F5E6A3',   // butter accent
  yellowDeep:   '#E8C84A',
  indigo:       '#3D3B8E',   // headings / active labels
  indigoPale:   '#EEEDF8',
  indigoMid:    '#6C63FF',   // interactive / icons
  textPrimary:  '#2B2D42',
  textSecondary:'#6B7280',
  border:       '#E4EDE2',
  shadow:       'rgba(61, 59, 142, 0.08)',
};

// ─── Data ────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'Fitness',       emoji: '🏃' },
  { label: 'Nutrition',     emoji: '🥗' },
  { label: 'Sleep',         emoji: '😴' },
  { label: 'Productivity',  emoji: '📚' },
  { label: 'Wellness',      emoji: '🧘' },
  { label: 'Other',         emoji: '✨' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function CreateHabitScreen() {
  const [habitName, setHabitName]       = useState('');
  const [selectedCategory, setCategory] = useState<string | null>(null);
  const [frequency, setFrequency]       = useState<'Daily' | 'Weekly'>('Daily');
  const [isPublic, setIsPublic]         = useState(false);

  const canSubmit = habitName.trim().length > 0 && selectedCategory !== null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Habit</Text>
          <Text style={styles.headerSub}>build something that sticks 🌱</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Habit Name ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionLabel text="What's your habit?" required />
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Drink 8 glasses of water"
              placeholderTextColor={C.textSecondary}
              value={habitName}
              onChangeText={setHabitName}
              maxLength={60}
              returnKeyType="done"
            />
            {/* character counter */}
            <Text style={styles.charCount}>{habitName.length}/60</Text>
          </View>
        </SectionCard>

        {/* ── Category ───────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionLabel text="Category" required />
          <View style={styles.pillGrid}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.label;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setCategory(cat.label)}
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

        {/* ── Frequency ──────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionLabel text="How often?" />
          <View style={styles.segmentedControl}>
            {(['Daily', 'Weekly'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.segment, frequency === opt && styles.segmentActive]}
                onPress={() => setFrequency(opt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentLabel, frequency === opt && styles.segmentLabelActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* ── Visibility ─────────────────────────────────────────────────── */}
        <SectionCard>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <SectionLabel text="Visibility" noMargin />
              <Text style={styles.toggleSub}>
                {isPublic
                  ? 'Friends can see this habit'
                  : 'Only you can see this habit'}
              </Text>
            </View>
            <View style={styles.toggleRight}>
              <Text style={[styles.toggleBadge, isPublic ? styles.publicBadge : styles.privateBadge]}>
                {isPublic ? 'Public' : 'Private'}
              </Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: C.border, true: C.sageMid }}
                thumbColor={isPublic ? C.sage : '#f0f0f0'}
                ios_backgroundColor={C.border}
              />
            </View>
          </View>
        </SectionCard>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          activeOpacity={canSubmit ? 0.85 : 1}
          disabled={!canSubmit}
        >
          <Text style={styles.submitLabel}>Add to Habitat</Text>
        </TouchableOpacity>

        {/* ── AI nudge ───────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.aiNudge} activeOpacity={0.75}>
          <View style={styles.aiNudgeInner}>
            <Text style={styles.aiNudgeIcon}>✦</Text>
            <View>
              <Text style={styles.aiNudgeTitle}>Not sure where to start?</Text>
              <Text style={styles.aiNudgeSub}>Let AI suggest habits based on your goals →</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionLabel({
  text,
  required,
  noMargin,
}: {
  text: string;
  required?: boolean;
  noMargin?: boolean;
}) {
  return (
    <View style={[styles.labelRow, noMargin && { marginBottom: 0 }]}>
      <Text style={styles.sectionLabel}>{text}</Text>
      {required && <Text style={styles.requiredDot}> *</Text>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 16,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  backArrow: {
    fontSize: 18,
    color: C.indigo,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.indigo,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 1,
  },
  leafBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.sagePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafEmoji: {
    fontSize: 18,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Card wrapper
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },

  // Section label
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.indigo,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  requiredDot: {
    fontSize: 14,
    color: C.indigoMid,
    fontWeight: '700',
  },

  // Text input
  inputWrapper: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    fontSize: 16,
    color: C.textPrimary,
    minHeight: 28,
  },
  charCount: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },

  // Category pills
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
    gap: 6,
  },
  pillActive: {
    backgroundColor: C.indigo,
    borderColor: C.indigo,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  pillLabelActive: {
    color: '#FFFFFF',
  },

  // Frequency segmented control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: C.sage,
    shadowColor: C.sage,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
  },
  segmentLabelActive: {
    color: '#FFFFFF',
  },

  // Visibility toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    flex: 1,
    gap: 3,
  },
  toggleSub: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 3,
  },
  toggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: 'hidden',
    letterSpacing: 0.4,
  },
  publicBadge: {
    backgroundColor: C.sagePale,
    color: C.sage,
  },
  privateBadge: {
    backgroundColor: C.indigoPale,
    color: C.indigoMid,
  },

  // Submit button
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: C.indigo,
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: C.indigo,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: C.sageMid,
    shadowOpacity: 0.1,
  },
  submitLeaf: {
    fontSize: 18,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // AI nudge
  aiNudge: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.yellow,
    backgroundColor: '#FEFDF5',
    padding: 14,
  },
  aiNudgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiNudgeIcon: {
    fontSize: 22,
    color: C.yellowDeep,
  },
  aiNudgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
  },
  aiNudgeSub: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 1,
  },
});
