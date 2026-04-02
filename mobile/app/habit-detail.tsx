import CheckInModal from '@/components/checkin-modal';
import { useCheckInsForMonth, useUpsertCheckIn, buildMonthKey } from '@/hooks/use-checkin';
import { useDeleteHabit, useHabitDetail } from '@/hooks/use-habits';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  red:           '#FF6B6B',
  redPale:       '#FFF0F0',
};

// Map category enum → display label + emoji
const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  FITNESS:      { label: 'Fitness',      emoji: '🏃' },
  NUTRITION:    { label: 'Nutrition',    emoji: '🥗' },
  SLEEP:        { label: 'Sleep',        emoji: '😴' },
  PRODUCTIVITY: { label: 'Productivity', emoji: '📋' },
  WELLNESS:     { label: 'Wellness',     emoji: '🧘' },
  OTHER:        { label: 'Other',        emoji: '⭐' },
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Format ISO date string → "Feb 1, 2026"
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HabitDetailScreen() {
  const router = useRouter();
  const { id: habitId } = useLocalSearchParams<{ id: string }>();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: habit, isLoading: habitLoading } = useHabitDetail(habitId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year  = today.getFullYear();
  const month = today.getMonth();

  // Grid start — the Sunday that opens the 5-week window
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - today.getDay() - 28);
  gridStart.setHours(0, 0, 0, 0);

  const { data: monthCheckIns = {} } = useCheckInsForMonth(year, month);

  // Build today's cache key — must match buildMonthKey in use-checkin.ts
  const todayKey = buildMonthKey(habitId, new Date(year, month, today.getDate(), 12));
  const checkedIn = monthCheckIns[todayKey]?.completed ?? false;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: saveCheckIn }                        = useUpsertCheckIn(year, month);
  const { mutate: deleteHabit, isPending: isDeleting } = useDeleteHabit(habitId);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible]         = useState(false);
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null);
  const [notes, setNotes]                       = useState('');

  // ── Loading state ──────────────────────────────────────────────────────────
  if (habitLoading || !habit) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.sage} />
      </SafeAreaView>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const meta           = CATEGORY_META[habit.habitCategory] ?? CATEGORY_META.OTHER;
  const stats          = habit.stats;
  const completionRate = stats
    ? Math.round((stats.totalCompletions / Math.max(stats.totalDays, 1)) * 100)
    : 0;
  // derive best streak live so it reflects today's check-in immediately
  const liveBestStreak = stats
    ? Math.max(stats.bestStreak, stats.currentStreak, checkedIn ? 1 : 0)
    : 0;

  const freqLabel = habit.frequency === 'DAILY' ? 'Daily' : 'Weekly';

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleCheckIn() {
    if (checkedIn) {
      saveCheckIn({
        habitId,
        date: new Date(year, month, today.getDate(), 12).toISOString(),
        completed: false,
        difficultyRating: monthCheckIns[todayKey]?.difficultyRating ?? null,
        notes: monthCheckIns[todayKey]?.notes ?? '',
      });
    } else {
      setDifficultyRating(monthCheckIns[todayKey]?.difficultyRating ?? null);
      setNotes(monthCheckIns[todayKey]?.notes ?? '');
      setModalVisible(true);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteHabit(undefined, {
              onSuccess: () => router.replace('/(tabs)/home'),
            });
          },
        },
      ],
    );
  }

  function handleEdit() {
    if (!habit) return;
    router.push({
      pathname: '/create-habit',
      params: {
        habitId:       habit.id,
        name:          habit.name,
        habitCategory: habit.habitCategory,
        frequency:     habit.frequency,
        visibility:    habit.visibility ? 'true' : 'false',
      },
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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
            onPress={() => router.push('/(tabs)/home')}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroAccent} />
            <View style={styles.heroTop}>
              <View style={styles.emojiCircle}>
                <Text style={styles.heroEmoji}>{meta.emoji}</Text>
              </View>
              <View style={styles.heroBadges}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{meta.label}</Text>
                </View>
                <View style={styles.freqBadge}>
                  <Text style={styles.freqBadgeText}>{freqLabel}</Text>
                </View>
                <View style={[styles.visibilityBadge, habit.visibility ? styles.publicBadge : styles.privateBadge]}>
                  <Text style={[styles.visibilityText, habit.visibility ? styles.publicText : styles.privateText]}>
                    {habit.visibility ? 'Public' : 'Private'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.habitName}>{habit.name}</Text>
            <Text style={styles.habitSince}>Tracking since {formatDate(habit.createdAt)}</Text>
          </View>

          {/* Quick check-in */}
          <TouchableOpacity
            style={[styles.checkInBtn, checkedIn && styles.checkInBtnDone]}
            onPress={handleCheckIn}
            activeOpacity={0.85}
          >
            <Text style={styles.checkInIcon}>{checkedIn ? '✓' : '○'}</Text>
            <Text style={styles.checkInLabel}>
              {checkedIn ? 'Completed today!' : 'Mark as complete today'}
            </Text>
          </TouchableOpacity>

          {/* Stats row */}
          {stats && (
            <View style={styles.statsRow}>
              <StatCard
                value={`${stats.currentStreak}`}
                label="Current Streak"
                sublabel={`Best: ${liveBestStreak} days`}
                emoji="🔥"
                accent={C.yellowDeep}
                accentPale={C.yellow}
              />
              <StatCard
                value={`${completionRate}%`}
                label="Completion Rate"
                sublabel={`${stats.totalCompletions} of ${stats.totalDays} days`}
                emoji="📈"
                accent={C.sage}
                accentPale={C.sagePale}
              />
            </View>
          )}

          {/* Calendar dot grid */}
          {stats && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Last 5 Weeks</Text>
                <Text style={styles.sectionSub}>{stats.totalCompletions} completions</Text>
              </View>

              <View style={styles.dayLabelsRow}>
                {DAY_LABELS.map((d, i) => (
                  <Text key={i} style={styles.dayLabel}>{d}</Text>
                ))}
              </View>

              {[0, 1, 2, 3, 4].map((week) => (
                <View key={week} style={styles.dotRow}>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const idx     = week * 7 + day;
                    const gridVal = stats.completionGrid[idx];

                    // Build the date this cell represents
                    const cellDate = new Date(gridStart);
                    cellDate.setDate(gridStart.getDate() + idx);
                    const cellKey = buildMonthKey(habitId, cellDate);

                    // Use live check-in cache for this cell if available,
                    // otherwise fall back to the grid from the backend
                    const liveEntry = monthCheckIns[cellKey];
                    const val = liveEntry !== undefined ? liveEntry.completed : gridVal;

                    return (
                      <View
                        key={day}
                        style={[
                          styles.dot,
                          val === true  && styles.dotCompleted,
                          val === false && styles.dotMissed,
                          val === null  && styles.dotFuture,
                        ]}
                      />
                    );
                  })}
                </View>
              ))}

              <View style={styles.legend}>
                <LegendItem color={C.sage}   label="Completed" />
                <LegendItem color={C.red}    label="Missed" />
                <LegendItem color={C.border} label="No data" />
              </View>
            </View>
          )}

          {/* Progress bar */}
          {stats && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Overall Progress</Text>
                <Text style={[styles.sectionSub, { color: C.indigo, fontWeight: '700' }]}>
                  {completionRate}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
              </View>
              <Text style={styles.progressCaption}>
                You've completed this habit {stats.totalCompletions} times out of {stats.totalDays} days tracked.
              </Text>
            </View>
          )}

          {/* Delete */}
          <TouchableOpacity
            style={[styles.deleteBtn, isDeleting && { opacity: 0.6 }]}
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={isDeleting}
          >
            <Text style={styles.deleteBtnText}>
              {isDeleting ? 'Deleting...' : 'Delete Habit'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        <CheckInModal
          visible={modalVisible}
          initialDifficultyRating={difficultyRating}
          initialNotes={notes}
          onClose={() => setModalVisible(false)}
          onSave={({ difficultyRating, notes }) => {
            saveCheckIn({
              habitId,
              date: new Date(year, month, today.getDate(), 12).toISOString(),
              completed: true,
              difficultyRating,
              notes,
            });
            setModalVisible(false);
          }}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  value, label, sublabel, emoji, accent, accentPale,
}: {
  value: string; label: string; sublabel: string;
  emoji: string; accent: string; accentPale: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: accent }]}>
      <View style={[styles.statIconCircle, { backgroundColor: accentPale }]}>
        <Text style={styles.statEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sublabel}</Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#EAF6E8',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: C.indigo,
    fontWeight: '600',
  },
  editBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: C.indigoPale,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.indigo,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 5,
    backgroundColor: C.sage,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 14,
  },
  emojiCircle: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.sagePale,
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji:  { fontSize: 26 },
  heroBadges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryBadge: {
    backgroundColor: C.sagePale, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 11, fontWeight: '700', color: C.sage,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  freqBadge: {
    backgroundColor: C.indigoPale, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  freqBadgeText: {
    fontSize: 11, fontWeight: '700', color: C.indigoMid,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  visibilityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  publicBadge:     { backgroundColor: C.sagePale },
  privateBadge:    { backgroundColor: C.indigoPale },
  visibilityText:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  publicText:      { color: C.sage },
  privateText:     { color: C.indigoMid },
  habitName: {
    fontSize: 22, fontWeight: '800', color: C.indigo,
    letterSpacing: -0.4, lineHeight: 28, marginBottom: 6,
  },
  habitSince: { fontSize: 12, color: C.textSecondary },
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: C.card, borderRadius: 16,
    paddingVertical: 15, marginBottom: 12, borderWidth: 2, borderColor: C.border,
  },
  checkInBtnDone: { backgroundColor: C.sagePale, borderColor: C.sage },
  checkInIcon:    { fontSize: 20, color: C.sage, fontWeight: '700' },
  checkInLabel:   { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  statsRow:       { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 18,
    padding: 16, alignItems: 'center', borderTopWidth: 4, gap: 4,
  },
  statIconCircle: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statEmoji:  { fontSize: 18 },
  statValue:  { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: {
    fontSize: 11, fontWeight: '700', color: C.textPrimary,
    textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4,
  },
  statSub:  { fontSize: 11, color: C.textSecondary, textAlign: 'center' },
  card:     { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: C.indigo,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionSub:   { fontSize: 12, color: C.textSecondary },
  dayLabelsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 6, paddingHorizontal: 2,
  },
  dayLabel: {
    width: 32, textAlign: 'center', fontSize: 11,
    fontWeight: '600', color: C.textSecondary,
  },
  dotRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 6, paddingHorizontal: 2,
  },
  dot:          { width: 32, height: 32, borderRadius: 8, backgroundColor: C.border },
  dotCompleted: { backgroundColor: C.sage },
  dotMissed:    { backgroundColor: C.red, opacity: 0.35 },
  dotFuture:    { backgroundColor: C.border, opacity: 0.4 },
  legend:       { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 10, height: 10, borderRadius: 3 },
  legendLabel:  { fontSize: 11, color: C.textSecondary, fontWeight: '500' },
  progressTrack: {
    height: 10, backgroundColor: C.border, borderRadius: 10,
    overflow: 'hidden', marginBottom: 10,
  },
  progressFill:    { height: '100%', backgroundColor: C.sage, borderRadius: 10 },
  progressCaption: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  deleteBtn: {
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    backgroundColor: C.redPale, borderWidth: 1.5, borderColor: C.red, marginBottom: 4,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: C.red },
});