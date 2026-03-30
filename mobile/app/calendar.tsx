import { router } from "expo-router";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import CheckInModal from '@/components/checkin-modal';
import { useUpsertCheckIn } from '@/hooks/use-checkin';

// ── Fake habits – replace with real data/store ────────────────
const HABITS = [
  { id: 'seeded-workout-habit', title: 'Fitness Habit'       },
  { id: '2', title: 'Nutrition Habit'     },
  { id: '3', title: 'Procrastination Habit' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Helper: days in a month ───────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Returns 0–1 representing a ratio of how many habits were checked on a given day.
// Used to render the partial green fill inside each day cell.
function completionRatio(
  habitCount: number,
  entries: EntryMap,
  year: number,
  month: number,
  day: number,
): number {
  if (habitCount === 0) return 0;
  const checked = HABITS.filter(
    h => entries[`${h.id}-${year}-${month}-${day}`]?.checked
  ).length;
  return checked / habitCount;
}

// ── Types ─────────────────────────────────────────────────────
type HabitEntry = {
  checked: boolean;
  difficultyRating: number | null;
  notes: string;
};
// key: `${habitId}-${year}-${month}-${day}`
type EntryMap = Record<string, HabitEntry>;

export default function CalendarScreen() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Which day's habits are shown below the grid (defaults to today)
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // Pixel height of a single day cell, measured via onLayout.
  const [cellHeight, setCellHeight] = useState(0);

  // Stored mood entries
  const [entries, setEntries] = useState<EntryMap>({});

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    habitId: string;
    day: number;
  } | null>(null);
  const [draftDifficultyRating, setDraftDifficultyRating] = useState<number | null>(null);
  const [draftNotes, setDraftNotes] = useState('');

  // ── Navigation ──────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const prevYear = () => setYear(y => y - 1);
  const nextYear = () => setYear(y => y + 1);

  // ── Build calendar grid ─────────────────────────────────────
  const daysInMonth  = getDaysInMonth(year, month);
  const firstDow     = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  // ── Modal helpers ───────────────────────────────────────────
  const openModal = (habitId: string, day: number) => {
    const key = `${habitId}-${year}-${month}-${day}`;
    const existing = entries[key];

    setModalTarget({ habitId, day });
    setDraftDifficultyRating(existing?.difficultyRating ?? null);
    setDraftNotes(existing?.notes ?? '');
    setModalVisible(true);
  };

  const saveModal = () => {
    if (!modalTarget) return;

    saveCheckIn({
      habitId: modalTarget.habitId,
      date: new Date(year, month, modalTarget.day).toISOString(),
      completed: true,
      difficultyRating: draftDifficultyRating,
      notes: draftNotes,
    });

    setModalVisible(false);
    setModalTarget(null);
  };

  const userId = 1; // replace later with auth
  const { mutate: saveCheckIn } = useUpsertCheckIn(year, month, userId);

  const entryForKey = (habitId: string, day: number) =>
    entries[`${habitId}-${year}-${month}-${day}`];

  const goBack = () => router.push("./(tabs)/home");

  return (
    <ImageBackground
      source={require('../assets/images/leaf.png')}
      style={styles.bg}
      imageStyle={{ opacity: 0.06 }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* ── Year navigator ─────────────────────────────────── */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={prevYear} style={styles.navArrow}>
            <Text style={styles.navArrowText}>«</Text>
          </TouchableOpacity>
          <Text style={styles.yearText}>{year}</Text>
          <TouchableOpacity onPress={nextYear} style={styles.navArrow}>
            <Text style={styles.navArrowText}>»</Text>
          </TouchableOpacity>
        </View>

        {/* ── Month navigator ────────────────────────────────── */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{MONTH_NAMES[month]}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Day-of-week header ─────────────────────────────── */}
        <View style={styles.grid}>
          {DAYS_OF_WEEK.map(d => (
            <View key={d} style={styles.cell}>
              <Text style={styles.dowText}>{d}</Text>
            </View>
          ))}

          {/* ── Day cells ─────────────────────────────────────── */}
          {cells.map((day, i) => {
            const ratio = day !== null
              ? completionRatio(HABITS.length, entries, year, month, day)
              : 0;

            const fillPx = cellHeight * ratio;

            return (
              <TouchableOpacity
                key={i}
                activeOpacity={day !== null ? 0.7 : 1}
                style={[
                  styles.cell,
                  day === selectedDay && styles.selectedCell,
                ]}
                onLayout={i === 0 && cellHeight === 0
                  ? e => setCellHeight(e.nativeEvent.layout.height)
                  : undefined}
                onPress={() => { if (day !== null) setSelectedDay(day); }}
              >
                {day !== null && fillPx > 0 && (
                  <View style={[styles.cellFill, { height: fillPx }]} />
                )}
                {day !== null && (
                  <Text style={[
                    styles.dayText,
                    day === selectedDay && styles.selectedDayText,
                  ]}>
                    {day}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Habits section ─────────────────────────────────── */}
        {/* Shows habits for the SELECTED day (tap any date above) */}
        <Text style={styles.sectionTitle}>
          Habits – {MONTH_NAMES[month]} {selectedDay}
        </Text>

        {HABITS.map(habit => {
          const entry = entryForKey(habit.id, selectedDay);
          const checked = entry?.checked ?? false;
          return (
            <View key={habit.id} style={styles.habitRow}>
              <Text style={styles.habitName}>{habit.title}</Text>

              {/* Check circle:
                  • Empty/white border  = not yet checked
                  • Solid green bubble + white ✓ = checked
                  Pressing it opens the mood/notes modal          */}
              <TouchableOpacity
                style={[styles.checkCircle, checked && styles.checkCircleDone]}
                onPress={() => {
                  if (checked) {
                    // Uncheck: keep the entry but flip checked to false
                    const key = `${habit.id}-${year}-${month}-${selectedDay}`;
                    setEntries(prev => ({
                      ...prev,
                      [key]: { ...prev[key], checked: false },
                    }));
                  } else {
                    openModal(habit.id, selectedDay);
                  }
                }}
              >
                {checked && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            </View>
          );
        })}

      </ScrollView>

      {/* ── Mood entry modal ─────────────────────────────────── */}
      <CheckInModal
        visible={modalVisible}
        initialDifficultyRating={draftDifficultyRating}
        initialNotes={draftNotes}
        onClose={() => {
          setModalVisible(false);
          setModalTarget(null);
        }}
        onSave={({ difficultyRating, notes }) => {
          if (!modalTarget) return;

          saveCheckIn({
            habitId: modalTarget.habitId,
            date: new Date(year, month, modalTarget.day).toISOString(),
            completed: true,
            difficultyRating,
            notes,
          });

          setModalVisible(false);
          setModalTarget(null);
        }}
      />

    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: Colors.pageBg,
  },
  container: {
    paddingTop: Spacing.lg * 2,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  backBtn: {
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
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

  // ── Navigation rows ──
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  navArrow: {
    padding: Spacing.sm,
  },
  navArrowText: {
    fontSize: FontSize.xl,
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  yearText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.medBrown,
    minWidth: 50,
    textAlign: 'center',
  },
  monthText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.darkBrown,
    minWidth: 120,
    textAlign: 'center',
  },

  // ── Calendar grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  cell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',   // clips the fill bar to the cell boundary
    position: 'relative',
  },
  cellFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.lightGreen,
    opacity: 0.55,        // translucent so the day number stays readable
    zIndex: 0,
  },
  dowText: {
    fontSize: FontSize.xs,
    color: Colors.lightBrown,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayText: {
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
    zIndex: 1,
  },

  // ── Habits ──
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: Spacing.sm,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  habitName: {
    fontSize: FontSize.md,
    color: Colors.darkBrown,
    fontWeight: '500',
    flex: 1,
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.midGreen,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inputBg,
  },
  checkCircleDone: {
    borderColor: Colors.primaryGreen,
    backgroundColor: Colors.paleGreen,
  },
  checkCircleText: {
    fontSize: 18,
  },
// White checkmark inside the green bubble
  checkMark: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
// Selected (non-today) day highlight
  selectedCell: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: Radius.sm,
  },
  selectedDayText: {
    color: Colors.white,
    fontWeight: '700',
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  moodBtn: {
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    width: 80,
  },
  moodBtnActive: {
    borderColor: Colors.primaryGreen,
    backgroundColor: Colors.paleGreen,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: FontSize.xs,
    color: Colors.medBrown,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    minHeight: 80,
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.midGreen,
  },
  cancelBtnText: {
    color: Colors.primaryGreen,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  saveBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryGreen,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
});