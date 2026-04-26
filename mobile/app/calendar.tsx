import CheckInDetailModal, { difficultyEmoji } from '@/components/checkin-detail-modal';
import CheckInModal from '@/components/checkin-modal';
import { FontSize, Radius, Spacing, createSharedStyles, useTheme } from '@/constants/theme';
import {
  MonthlyCheckInMap,
  buildMonthKey,
  useCheckInsForMonth,
  useUpsertCheckIn,
} from '@/hooks/use-checkin';
import api from '@/lib/api';
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Helpers ───────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// returns the Monday and Sunday that start/end the week that contains 'date'
function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const day       = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMon = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() + daysToMon);
  const weekEnd   = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  return { weekStart, weekEnd };
}

// for a weekly habit, returns the completed entry AND the exact date it was checked in, 
// for the week containing 'date' or null if none exists
function weeklyCheckInForDay(
  habitId: string,
  date: Date,
  entries: MonthlyCheckInMap,
): { entry: MonthlyCheckInMap[string]; date: Date } | null {
  const { weekStart, weekEnd } = getWeekBounds(date);
  let current = new Date(weekStart);
  while (current <= weekEnd) {
    const key   = buildMonthKey(habitId, new Date(current.getFullYear(), current.getMonth(), current.getDate(), 12));
    const entry = entries[key];
    if (entry?.completed) return {
      entry,
      date: new Date(current.getFullYear(), current.getMonth(), current.getDate(), 12),
    };
    current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
  }
  return null;
}

// returns true if date A is strictly before date B
function dateBefore(a: Date, b: Date) {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() < b.getFullYear();
  if (a.getMonth()    !== b.getMonth())    return a.getMonth()    < b.getMonth();
  return a.getDate() < b.getDate();
}

// Returns 0–1 representing a ratio of how many habits were checked on a given day.
// Used to render the partial green fill inside each day cell.
function completionRatio(
  habits: any[] = [],
  entries: MonthlyCheckInMap,
  year: number,
  month: number,
  day: number,
): number {
  if (habits.length === 0) return 0;

  const date    = new Date(year, month, day, 12);
  const checked = habits.filter((h) => {
    if (h.frequency === 'WEEKLY') {
      return weeklyCheckInForDay(h.id, date, entries) !== null;
    }
    const key = buildMonthKey(h.id, date);
    return entries[key]?.completed;
  }).length;

  return checked / habits.length;
}

export default function CalendarScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const sharedStyles = createSharedStyles(Colors);

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data: entries = {} } = useCheckInsForMonth(year, month);

  // adjacent months — needed for weekly habits in weeks that cross month boundaries
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthNum  = month === 0 ? 11 : month - 1;
  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonthNum  = month === 11 ? 0 : month + 1;
  const { data: prevEntries = {} } = useCheckInsForMonth(prevMonthYear, prevMonthNum);
  const { data: nextEntries = {} } = useCheckInsForMonth(nextMonthYear, nextMonthNum);

  // merged map used for all weekly habit lookups
  const allEntries = useMemo(
    () => ({ ...prevEntries, ...entries, ...nextEntries }),
    [prevEntries, entries, nextEntries]
  );

  const [habits, setHabits] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(today.getDate()); // which day's habits are shown below the grid (defaults to today)
  const [cellHeight, setCellHeight] = useState(0);

  // new check-in modal state (opened when tapping an unchecked habit today)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    habitId: string;
    day: number;
  } | null>(null);
  const [draftDifficultyRating, setDraftDifficultyRating] = useState<number | null>(null);
  const [draftNotes, setDraftNotes] = useState('');

  // detail/edit modal state (opened when tapping an already-completed habit)
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalTarget, setDetailModalTarget] = useState<{
    habitId: string;
    checkInDate: Date;       // actual date the check-in was recorded (may differ from selectedDay for weekly habits)
    checkInIsToday: boolean; // controls whether Undo is shown in the modal
    entry: { difficultyRating: number | null; notes: string };
    habitName: string;
  } | null>(null);

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const { data } = await api.get("/habits");
        setHabits(data.habits || data.data || []);
      } catch (err) {
        console.error("Failed to fetch habits:", err);
      }
    };
    fetchHabits();
  }, []);

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
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow    = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  // ── Derived date values ─────────────────────────────────────
  const todayDate    = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedDate = new Date(year, month, selectedDay);
  const isFuture     = dateBefore(todayDate, selectedDate);
  const isToday      = selectedDate.getTime() === todayDate.getTime();

  const { mutate: saveCheckIn } = useUpsertCheckIn(year, month);

  // looks up a check-in entry by habitId and day number
  // defaults to allEntries so cross-month weekly lookups work correctly
  const entryForKey = (habitId: string, day: number, map = allEntries) =>
    map[buildMonthKey(habitId, new Date(year, month, day, 12))];

  // only show habits that existed on or before the selected day
  const habitsForSelectedDay = habits.filter(habit => {
    const created     = new Date(habit.createdAt);
    const createdDate = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    return !dateBefore(selectedDate, createdDate); // selectedDate >= createdDate
  });

  // ── Modal helpers ───────────────────────────────────────────
  const openModal = (habitId: string, day: number) => {
    const key      = buildMonthKey(habitId, new Date(year, month, day, 12));
    const existing = allEntries[key];

    setModalTarget({ habitId, day });
    setDraftDifficultyRating(existing?.difficultyRating ?? null);
    setDraftNotes(existing?.notes ?? '');
    setModalVisible(true);
  };

  const goBack = () => router.push("./(tabs)/home");

  return (
    <ImageBackground
      source={require('../assets/images/leaf.png')}
      style={styles.bg}
      imageStyle={{ opacity: 0.06 }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Back button ────────────────────────────────────── */}
        <TouchableOpacity style={sharedStyles.backBtn} onPress={goBack}>
          <Text style={sharedStyles.backBtnText}>← Back</Text>
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
            // Filter habits by creation date when computing fill ratio
            const habitsForCell = day !== null
              ? habits.filter(h => {
                  const c        = new Date(h.createdAt);
                  const cellDate = new Date(year, month, day);
                  return !dateBefore(
                    cellDate,
                    new Date(c.getFullYear(), c.getMonth(), c.getDate())
                  );
                })
              : [];

            // suppress fill on future cells — data may exist but shouldn't be shown yet
            const cellDate     = day !== null ? new Date(year, month, day) : null;
            const isCellFuture = cellDate ? dateBefore(todayDate, cellDate) : false;

            const ratio  = day !== null && !isCellFuture
              ? completionRatio(habitsForCell, allEntries, year, month, day)
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
        <Text style={styles.sectionTitle}>
          Habits – {MONTH_NAMES[month]} {selectedDay}
        </Text>

        {isFuture ? (
          // future dates — no entries possible yet
          <View style={styles.noEntriesContainer}>
            <Text style={styles.noEntriesText}>No entries yet.</Text>
          </View>
        ) : habitsForSelectedDay.length === 0 ? (
          // no habits existed on this date
          <View style={styles.noEntriesContainer}>
            <Text style={styles.noEntriesText}>No habits on this day.</Text>
          </View>
        ) : (
          habitsForSelectedDay.map(habit => {
            // weekly habits: resolve entry and actual check-in date from the full week
            // daily habits: resolve entry directly from the selected day
            const weeklyResult = habit.frequency === 'WEEKLY'
              ? weeklyCheckInForDay(habit.id, selectedDate, allEntries)
              : null;

            const entry       = weeklyResult?.entry ?? entryForKey(habit.id, selectedDay);
            // the actual date the check-in was recorded — may differ from selectedDay for weekly habits
            const checkInDate = weeklyResult?.date ?? new Date(year, month, selectedDay, 12);
            // only show Undo in the detail modal if the check-in happened today
            const checkInIsToday =
              checkInDate.getFullYear() === todayDate.getFullYear() &&
              checkInDate.getMonth()    === todayDate.getMonth()    &&
              checkInDate.getDate()     === todayDate.getDate();

            const checked = entry?.completed ?? false;

            return (
              <View key={habit.id} style={styles.habitContainer}>
                <View style={styles.habitRow}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <TouchableOpacity
                    style={[
                      styles.checkCircle,
                      checked && styles.checkCircleDone,
                      !checked && isToday && styles.checkCircleToday,
                      !checked && !isToday && styles.checkCircleDisabled,
                    ]}
                    onPress={() => {
                      if (checked) {
                        // Open detail modal with the correct check-in date and undo eligibility
                        setDetailModalTarget({
                          habitId: habit.id,
                          checkInDate,
                          checkInIsToday,
                          entry: {
                            difficultyRating: entry?.difficultyRating ?? null,
                            notes: entry?.notes ?? '',
                          },
                          habitName: habit.name,
                        });
                        setDetailModalVisible(true);
                      } else {
                        // only allow new check-ins on today
                        if (!isToday) return;
                        openModal(habit.id, selectedDay);
                      }
                    }}
                    disabled={!checked && !isToday}
                  >
                    {/* show difficulty emoji if check-in has one, fallback to checkmark */}
                    <Text style={checked ? styles.checkCircleText : undefined}>
                      {checked ? difficultyEmoji(entry?.difficultyRating ?? null) : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>

      {/* ── Check-in modal (today, unchecked habit) ──────── */}
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
            date: new Date(year, month, modalTarget.day, 12).toISOString(),
            completed: true,
            difficultyRating,
            notes,
          });

          setModalVisible(false);
          setModalTarget(null);
        }}
      />

      {/* ── Check-in detail modal (view/edit completed habit) ── */}
      <CheckInDetailModal
        visible={detailModalVisible}
        habitName={detailModalTarget?.habitName ?? ''}
        difficultyRating={detailModalTarget?.entry.difficultyRating ?? null}
        notes={detailModalTarget?.entry.notes ?? ''}
        isToday={detailModalTarget?.checkInIsToday ?? false}
        onClose={() => {
          setDetailModalVisible(false);
          setDetailModalTarget(null);
        }}
        onSave={({ difficultyRating, notes }) => {
          if (!detailModalTarget) return;
          // save to the actual check-in date, not the currently selected calendar day  
          saveCheckIn({
            habitId: detailModalTarget.habitId,
            date: detailModalTarget.checkInDate.toISOString(),
            completed: true,
            difficultyRating,
            notes,
          });
          setDetailModalVisible(false);
          setDetailModalTarget(null);
        }}
        onUndo={() => {
          if (!detailModalTarget) return;
          // undo against the actual check-in date so the backend finds the right record
          saveCheckIn({
            habitId: detailModalTarget.habitId,
            date: detailModalTarget.checkInDate.toISOString(),
            completed: false,
            difficultyRating: null,
            notes: '',
          });
          setDetailModalVisible(false);
          setDetailModalTarget(null);
        }}
      />

    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────
const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: Colors.pageBg,
  },
  container: {
    paddingTop: Spacing.top_margin,
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
    color: Colors.midBrown,
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
  // completed check-in — solid pale green fill
  checkCircleDone: {
    borderColor: Colors.primaryGreen,
    backgroundColor: Colors.paleGreen,
  },
  // past day, not checked — faded and non-interactive
  checkCircleDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.inputBg,
    opacity: 0.4,
  },
  // today, not yet checked
  checkCircleToday: {
    borderColor: Colors.primaryGreen,
    borderWidth: 2.0,
    backgroundColor: 'transparent',
  },
  // emoji or checkmark rendered inside a completed circle
  checkCircleText: {
    color: Colors.primaryGreen,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  // selected (non-today) day highlight
  selectedCell: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: Radius.sm,
  },
  selectedDayText: {
    color: Colors.white,
    fontWeight: '700',
  },
  noEntriesContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  noEntriesText: {
    fontSize: FontSize.md,
    color: Colors.lightBrown,
    fontStyle: 'italic',
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
    color: Colors.midBrown,
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
  habitContainer: {
    marginBottom: Spacing.sm,
  },
  notesDropdown: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesText: {
    fontSize: FontSize.sm,
    color: Colors.darkBrown,
    lineHeight: 18,
  },
});