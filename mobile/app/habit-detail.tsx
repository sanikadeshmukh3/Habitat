import CheckInModal from '@/components/checkin-modal';
import { buildMonthKey, useCheckInsForMonth, useUpsertCheckIn } from '@/hooks/use-checkin';
import { useDeleteHabit, useHabitDetail } from '@/hooks/use-habits';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
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
import { useTheme, FontSize, Radius, Spacing, createSharedStyles } from '@/constants/theme'

// // Palette
// const C = {
//   // bg:            '#F7FAF5',
//   // card:          '#FFFFFF',
//   // sage:          '#7BAE7F',
//   // sageMid:       '#A8C5A0',
//   // sagePale:      '#E3F0E1',
//   // yellow:        '#F5E6A3',
//   // yellowDeep:    '#E8C84A',
//   // indigo:        '#3D3B8E',
//   // indigoPale:    '#EEEDF8',
//   // indigoMid:     '#6C63FF',
//   // textPrimary:   '#2B2D42',
//   // textSecondary: '#6B7280',
//   // border:        '#E4EDE2',
//   // red:           '#FF6B6B',
//   // redPale:       '#FFF0F0',
// };

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
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]); 
  const sharedStyles = createSharedStyles(Colors);
  
  const router = useRouter();
  const { id: habitId } = useLocalSearchParams<{ id: string }>();

  // ── Data fetching ──────────────────────────────────────────────────────────
  // NOTE: useHabitDetail should now return `inProbationPeriod: boolean` from the
  // GET /habits/:id response (populated by getHabitWithStreakHealth in the backend).
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
        <ActivityIndicator size="large" color={Colors.midGreen} />
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

  // ── Probation period — NEW ─────────────────────────────────────────────────
  // `habit.inProbationPeriod` is set by getHabitWithStreakHealth on the backend.
  // Only relevant for DAILY habits.
  const inProbationPeriod = habit.frequency === 'DAILY' && (habit.inProbationPeriod ?? false);

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
            style={sharedStyles.backBtn}
            onPress={() => router.push('/(tabs)/home')}
            activeOpacity={0.7}
          >
            <Text style={sharedStyles.backBtnText}>← Back</Text>
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

          {/* ── Probation period warning banner — NEW ── */}
          {inProbationPeriod && (
            <View style={styles.probationBanner}>
              <Text style={styles.probationBannerText}>
                ⏰ Probation period active — check in today to keep your streak!
              </Text>
            </View>
          )}

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
                value={`${stats.currentStreak}${inProbationPeriod ? ' ⏰' : ''}`}
                label="Current Streak"
                sublabel={`Best: ${liveBestStreak} days`}
                emoji="🔥"
                accent={Colors.midGreen}
                accentPale={Colors.paleGreen}
                styles={styles}
              />
              <StatCard
                value={`${completionRate}%`}
                label="Completion Rate"
                sublabel={`${stats.totalCompletions} of ${stats.totalDays} days`}
                emoji="📈"
                accent={Colors.midGreen}
                accentPale={Colors.paleGreen}
                styles={styles}
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
                <LegendItem color={Colors.midGreen}   label="Completed" styles={styles} />
                <LegendItem color={Colors.danger}    label="Missed" styles={styles} />
                <LegendItem color={Colors.border} label="No data" styles={styles} />
              </View>
            </View>
          )}

          {/* Progress bar */}
          {stats && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Overall Progress</Text>
                <Text style={[styles.sectionSub, { color: Colors.primaryIndigo, fontWeight: '700' }]}>
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
  value, label, sublabel, emoji, accent, accentPale, styles,
}: {
  value: string; label: string; sublabel: string;
  emoji: string; accent: string; accentPale: string;
  styles: ReturnType<typeof makeStyles> 
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

function LegendItem({ color, label, styles }: { color: string; label: string, styles: ReturnType<typeof makeStyles>  }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: Colors.pageBg,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.top_margin,
    paddingBottom: Spacing.ms,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: FontSize.lg,
    color: Colors.primaryIndigo,
    fontWeight: '600',
  },
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.paleIndigo,
  },
  editBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryIndigo,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  heroCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.ms,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 5,
    backgroundColor: Colors.midGreen,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.ms,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emojiCircle: {
    width: 52, height: 52, borderRadius: Radius.md,
    backgroundColor: Colors.paleGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji:  { fontSize: FontSize.xxl },
  heroBadges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryBadge: {
    backgroundColor: Colors.paleGreen, paddingHorizontal: Spacing.ms,
    paddingVertical: Spacing.xs, borderRadius: Radius.lg,
  },
  categoryBadgeText: {
    fontSize: 11, fontWeight: '700', color: Colors.midGreen,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  freqBadge: {
    backgroundColor: Colors.paleIndigo, paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs, borderRadius: Radius.lg,
  },
  freqBadgeText: {
    fontSize: 11, fontWeight: '700', color: Colors.midIndigo,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  visibilityBadge: { paddingHorizontal: Spacing.ms, paddingVertical: Spacing.xs, borderRadius: Radius.lg },
  publicBadge:     { backgroundColor: Colors.paleGreen },
  privateBadge:    { backgroundColor: Colors.paleIndigo },
  visibilityText:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  publicText:      { color: Colors.midGreen },
  privateText:     { color: Colors.midIndigo },
  habitName: {
    fontSize: FontSize.xl, fontWeight: '800', color: Colors.primaryIndigo,
    letterSpacing: -0.4, lineHeight: 28, marginBottom: Spacing.sm,
  },
  habitSince: { fontSize: 12, color: Colors.lightBrown },
  // ── Probation period banner ──────────────────────────────────────────────
  probationBanner: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.md,
    paddingVertical: Spacing.ms,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.ms,
    borderWidth: 1.5,
    borderColor: Colors.midGreen,
  },
  probationBannerText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.lightBrown,
    textAlign: 'center',
  },
  // ──────────────────────────────────────────────────────────────────────────
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.cardBg, borderRadius: Radius.md,
    paddingVertical: Spacing.md, marginBottom: Spacing.ms, borderWidth: 2, borderColor: Colors.border,
  },
  checkInBtnDone: { backgroundColor: Colors.paleGreen, borderColor: Colors.midGreen },
  checkInIcon:    { fontSize: FontSize.xl, color: Colors.midGreen, fontWeight: '700' },
  checkInLabel:   { fontSize: FontSize.md, fontWeight: '700', color: Colors.darkBrown },
  statsRow:       { flexDirection: 'row', gap: Spacing.ms, marginBottom: Spacing.ms },
  statCard: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', borderTopWidth: Spacing.xs, gap: Spacing.xs,
  },
  statIconCircle: {
    width: 38, height: 38, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  statEmoji:  { fontSize: FontSize.lg },
  statValue:  { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.darkBrown,
    textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4,
  },
  statSub:  { fontSize: FontSize.xs, color: Colors.lightBrown, textAlign: 'center' },
  card:     { backgroundColor: Colors.cardBg, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.ms },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.ms,
  },
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryIndigo,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionSub:   { fontSize: FontSize.xs, color: Colors.lightBrown },
  dayLabelsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
  dayLabel: {
    width: 32, textAlign: 'center', fontSize: FontSize.xs,
    fontWeight: '600', color: Colors.lightBrown,
  },
  dotRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
  dot:          { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.border },
  dotCompleted: { backgroundColor: Colors.midGreen },
  dotMissed:    { backgroundColor: Colors.danger, opacity: 0.35 },
  dotFuture:    { backgroundColor: Colors.border, opacity: 0.4 },
  legend:       { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.ms, justifyContent: 'center' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot:    { width: 10, height: 10, borderRadius: 3 },
  legendLabel:  { fontSize: FontSize.xs, color: Colors.lightBrown, fontWeight: '500' },
  progressTrack: {
    height: 10, backgroundColor: Colors.border, borderRadius: Radius.sm,
    overflow: 'hidden', marginBottom: Spacing.ms,
  },
  progressFill:    { height: '100%', backgroundColor: Colors.midGreen, borderRadius: Radius.sm },
  progressCaption: { fontSize: FontSize.xs, color: Colors.lightBrown, lineHeight: 17 },
  deleteBtn: {
    borderRadius: Radius.md, paddingVertical: Spacing.ms, alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.danger, marginBottom: Spacing.xs,
  },
  deleteBtnText: { fontSize: Spacing.md, fontWeight: '700', color: Colors.danger },
});