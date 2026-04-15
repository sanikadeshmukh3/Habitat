/*
 * This file defines the TypeScript types used in the Recap utility of the Habitat mobile app.
 * It includes types for habit records, check-ins, daily summaries, weekly recaps, and related data structures.
 * It also includes calculated fields like completion ratios and archetype results that are derived from the raw data.
 */


// These are the types used across the Recap utility, including the main WeeklyRecap type and related subtypes.

export type WeekdayKey = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export type HabitRecord = {
  id: string;
  name: string;
  active?: boolean;
  habitCategory?: string;
  frequency?: string;
  createdAt?: string | Date | null;
};

export type HabitCheckInRecord = {
  id?: string;
  habitId: string;
  date: string;
  completed?: boolean;
  difficultyRating?: number | null;
  notes?: string | null;
};

export type DaySummary = {
  date: Date;
  weekday: WeekdayKey;
  expected: number;
  completed: number;
  ratio: number;
  isFuture: boolean;
};

export type WeekdayItem = {
  key: WeekdayKey;
  dateNumber: number;
  done: boolean;
  isToday: boolean;
  isFuture: boolean;
  ratio: number | null;
};

export type Animal =
  | 'Wolf'
  | 'Bee'
  | 'Owl'
  | 'Jaguar'
  | 'Bear'
  | 'Dog'
  | 'Bunny'
  | 'Swan'
  | 'Fox'
  | 'Monkey'
  | 'Turtle'
  | 'Sloth'
  | 'Snail'
  | 'Fallback';

export type ArchetypeResult = {
  animal: Animal;
  title: string;
  description: string;
  tier: 'strong' | 'average' | 'weak';
};

export type WeeklyRecap = {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  daysIncluded: number;
  scores: {
    completionScore: number;
    consistencyScore: number;
    streakScore: number;
    dailyVariance: number;
    recoveryScore: number;
    activityScore: number;
    reflectionScore: number;
    difficultyScore: number;
  };
  weekItems: WeekdayItem[];
  archetype: ArchetypeResult;
  snapshots: {
    completionPulse: {
      percent: number;
      insight: string;
    };
    categoryLeader: {
      topCategory: string;
      topPercent: number;
      weakestCategory: string;
      weakestPercent: number;
      insight: string;
    };
    rhythmCheck: {
      strongDays: number;
      bestDay: string;
      weakestDay: string;
      insight: string;
    };
    moodBoard: {
      averageDifficulty: number | null;
      label: string;
      insight: string;
    };
  };
  weeklyHighlight: string;
  aiSummaryStatus: 'coming_soon';
};

// These are the date helper functions

export const WEEKDAY_ORDER: WeekdayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseDate(date: string | Date) {
  if (date instanceof Date) return date;

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(date);
}

function getHabitEffectiveStartDate(
  habit: HabitRecord,
  checkIns: HabitCheckInRecord[]
) {
  const createdAtDate = habit.createdAt ? startOfDay(parseDate(habit.createdAt)) : null;

  const habitCheckInDates = checkIns
    .filter((c) => c.habitId === habit.id)
    .map((c) => startOfDay(parseDate(c.date)));

  const firstCheckInDate =
    habitCheckInDates.length > 0
      ? new Date(Math.min(...habitCheckInDates.map((d) => d.getTime())))
      : null;

  if (createdAtDate && firstCheckInDate) {
    return createdAtDate <= firstCheckInDate ? createdAtDate : firstCheckInDate;
  }

  if (createdAtDate) return createdAtDate;
  if (firstCheckInDate) return firstCheckInDate;

  return null;
}

function habitExistsOnDate(
  habit: HabitRecord,
  date: Date,
  checkIns: HabitCheckInRecord[]
) {
  const effectiveStart = getHabitEffectiveStartDate(habit, checkIns);
  if (!effectiveStart) return true;

  return effectiveStart <= endOfDay(date);
}

function isCompletedCheckIn(checkIn: HabitCheckInRecord) {
  return Boolean(checkIn.completed);
}

export function startOfWeekSunday(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function getWeekKey(date: Date) {
  const sunday = startOfWeekSunday(date);
  return sunday.toISOString().slice(0, 10);
}

export function getWeekWindow(date: Date) {
  const start = startOfWeekSunday(date);
  const end = addDays(start, 6);
  return { start, end };
}

// This builds the weekly summaries from Sunday - Saturday

export function buildWeeklyDaySummaries(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
): DaySummary[] {
  const activeHabits = habits.filter((h) => h.active !== false);
  const weekStart = startOfWeekSunday(now);

  const summaries: DaySummary[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(weekStart, i);
    const isFuture = currentDate > endOfDay(now);

    const expectedHabits = isFuture
      ? []
      : activeHabits.filter((habit) => habitExistsOnDate(habit, currentDate, checkIns));

    const expected = expectedHabits.length;

    let completed = 0;

    if (!isFuture) {
      for (const habit of expectedHabits) {
        const found = checkIns.some((checkIn) => {
          const checkInDate = parseDate(checkIn.date);

          return (
            checkIn.habitId === habit.id &&
            Boolean(checkIn.completed) &&
            sameDay(checkInDate, currentDate)
          );
        });

        if (found) completed += 1;
      }
    }

    summaries.push({
      date: currentDate,
      weekday: WEEKDAY_ORDER[currentDate.getDay()],
      expected,
      completed,
      ratio: expected > 0 ? completed / expected : 0,
      isFuture,
    });
  }

  return summaries;
}

// This converts the daily summaries into the format needed for the weekItems in the WeeklyRecap

export function buildWeekItems(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
): WeekdayItem[] {
  const summaries = buildWeeklyDaySummaries(habits, checkIns, now);

  return summaries.map((day) => ({
    key: day.weekday,
    dateNumber: day.date.getDate(),
    done: !day.isFuture && day.ratio >= 0.7,
    isToday: sameDay(day.date, now),
    isFuture: day.isFuture,
    ratio: day.isFuture ? null : day.ratio,
  }));
}

// Helper function for elapsed days (not to be confused with future days)

function getElapsedDaySummaries(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  return buildWeeklyDaySummaries(habits, checkIns, now).filter((d) => !d.isFuture);
}

// Key Metrics

export function computeCompletionScore(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const days = getElapsedDaySummaries(habits, checkIns, now);
  const totalExpected = days.reduce((sum, d) => sum + d.expected, 0);
  const totalCompleted = days.reduce((sum, d) => sum + d.completed, 0);

  if (totalExpected === 0) return 0;
  return totalCompleted / totalExpected;
}

export function computeConsistencyScore(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const days = getElapsedDaySummaries(habits, checkIns, now).filter((d) => d.expected > 0);
  if (days.length === 0) return 0;

  const successfulDays = days.filter((d) => d.ratio >= 0.7).length;
  return successfulDays / days.length;
}

export function computeStreakScore(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const days = getElapsedDaySummaries(habits, checkIns, now).filter((d) => d.expected > 0);
  if (days.length === 0) return 0;

  let longest = 0;
  let current = 0;

  for (const day of days) {
    if (day.ratio >= 0.7) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest / days.length;
}

export function computeDailyVariance(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const days = getElapsedDaySummaries(habits, checkIns, now).filter((d) => d.expected > 0);
  if (days.length === 0) return 0;

  const ratios = days.map((d) => d.ratio);
  return Math.max(...ratios) - Math.min(...ratios);
}

export function computeRecoveryScore(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const days = getElapsedDaySummaries(habits, checkIns, now).filter((d) => d.expected > 0);
  if (days.length <= 1) return 0.5;

  let lowDays = 0;
  let rebounds = 0;

  for (let i = 0; i < days.length - 1; i++) {
    const current = days[i];
    const next = days[i + 1];

    if (current.ratio < 0.4) {
      lowDays += 1;
      if (next.ratio >= 0.7) rebounds += 1;
    }
  }

  if (lowDays === 0) return 0.5;
  return rebounds / lowDays;
}

export function computeActivityScore(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const days = getElapsedDaySummaries(habits, checkIns, now).filter((d) => d.expected > 0);
  if (days.length === 0) return 0;

  const activeDays = days.filter((d) => d.completed > 0).length;
  return activeDays / days.length;
}

export function computeReflectionScore(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const activeHabitIds = new Set(habits.filter((h) => h.active !== false).map((h) => h.id));
  const weekStart = startOfWeekSunday(now);

  const relevant = checkIns.filter((c) => {
    const d = parseDate(c.date);
    return (
      activeHabitIds.has(c.habitId) &&
      isCompletedCheckIn(c) &&
      d >= weekStart &&
      d <= endOfDay(now)
    );
  });

  if (relevant.length === 0) return 0;

  const noted = relevant.filter((c) => (c.notes?.trim().length ?? 0) > 0);
  const noteFrequency = noted.length / relevant.length;

  const avgNoteLength =
    noted.length > 0
      ? noted.reduce((sum, c) => sum + (c.notes?.trim().length ?? 0), 0) / noted.length
      : 0;

  const noteLengthScore = Math.min(1, avgNoteLength / 120);

  return 0.7 * noteFrequency + 0.3 * noteLengthScore;
}

export function computeDifficultyScore(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const activeHabitIds = new Set(habits.filter((h) => h.active !== false).map((h) => h.id));
  const weekStart = startOfWeekSunday(now);

  const relevant = checkIns.filter((c) => {
    const d = parseDate(c.date);
    return (
      activeHabitIds.has(c.habitId) &&
      isCompletedCheckIn(c) &&
      d >= weekStart &&
      d <= endOfDay(now) &&
      typeof c.difficultyRating === 'number'
    );
  });

  if (relevant.length === 0) return 0;

  const avgDifficulty =
    relevant.reduce((sum, c) => sum + (c.difficultyRating ?? 0), 0) / relevant.length;

  return Math.max(0, Math.min(1, (avgDifficulty - 1) / 4));
}

// Category Breakdown

export function computeCategoryBreakdown(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const weekStart = startOfWeekSunday(now);
  const todayEnd = endOfDay(now);

  const activeHabits = habits.filter((h) => h.active !== false);

  const byCategory: Record<
    string,
    { expected: number; completed: number; ratio: number }
  > = {};

  const elapsedDays = getElapsedDaySummaries(habits, checkIns, now).length;

  for (const habit of activeHabits) {
    const category = habit.habitCategory ?? 'Other';

    if (!byCategory[category]) {
      byCategory[category] = {
        expected: 0,
        completed: 0,
        ratio: 0,
      };
    }

    byCategory[category].expected += elapsedDays;

    const habitCompleted = checkIns.filter((c) => {
      const d = parseDate(c.date);
      return (
        c.habitId === habit.id &&
        Boolean(c.completed) &&
        d >= weekStart &&
        d <= todayEnd
      );
    }).length;

    byCategory[category].completed += habitCompleted;
  }

  for (const category of Object.keys(byCategory)) {
    const item = byCategory[category];
    item.ratio = item.expected > 0 ? item.completed / item.expected : 0;
  }

  return byCategory;
}

// Average Difficulty

export function computeAverageDifficulty(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
) {
  const activeHabitIds = new Set(habits.filter((h) => h.active !== false).map((h) => h.id));
  const weekStart = startOfWeekSunday(now);

  const relevant = checkIns.filter((c) => {
    const d = parseDate(c.date);
    return (
      activeHabitIds.has(c.habitId) &&
      isCompletedCheckIn(c) &&
      d >= weekStart &&
      d <= endOfDay(now) &&
      typeof c.difficultyRating === 'number'
    );
  });

  if (relevant.length === 0) return null;

  const total = relevant.reduce((sum, c) => sum + (c.difficultyRating ?? 0), 0);
  return total / relevant.length;
}

export function getDifficultyLabel(avg: number | null) {
  if (avg == null) return 'No data';
  if (avg < 2.5) return 'Easy';
  if (avg < 3.5) return 'Okay';
  return 'Hard';
}

// Archetype Selection

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function near(value: number, target: number, tolerance = 0.2) {
  const distance = Math.abs(value - target);
  return clamp(1 - distance / tolerance);
}

function above(value: number, threshold: number, softness = 0.15) {
  return clamp((value - threshold + softness) / softness);
}

function below(value: number, threshold: number, softness = 0.15) {
  return clamp((threshold - value + softness) / softness);
}

function getTier(scores: WeeklyRecap['scores']): 'strong' | 'average' | 'weak' {
  const { completionScore, consistencyScore } = scores;

  if (completionScore >= 0.72 && consistencyScore >= 0.68) {
    return 'strong';
  }

  if (completionScore < 0.45 && consistencyScore < 0.4) {
    return 'weak';
  }

  return 'average';
}

type Candidate = ArchetypeResult & { score: number };

export function selectArchetype(scores: WeeklyRecap['scores']): ArchetypeResult {
  const {
    completionScore,
    consistencyScore,
    streakScore,
    dailyVariance,
    recoveryScore,
    activityScore,
    reflectionScore,
    difficultyScore,
  } = scores;

  const tier = getTier(scores);

  if (tier === 'strong') {
    if (
      completionScore >= 0.9 &&
      consistencyScore >= 0.85 &&
      streakScore >= 0.8 &&
      dailyVariance <= 0.15
    ) {
      return {
        animal: 'Wolf',
        title: 'Relentless Wolf',
        description: 'You were elite and kept a highly controlled rhythm throughout the week.',
        tier: 'strong',
      };
    }

    const strongCandidates: Candidate[] = [
      {
        animal: 'Bee',
        title: 'Busy Bee',
        description: 'You kept moving, stayed productive, and carried strong momentum all week.',
        tier: 'strong',
        score:
          0.45 * above(activityScore, 0.8) +
          0.25 * above(completionScore, 0.7) +
          0.15 * above(consistencyScore, 0.65) +
          0.15 * above(difficultyScore, 0.55),
      },
      {
        animal: 'Owl',
        title: 'Insightful Owl',
        description: 'You paired a solid week with strong awareness and reflection.',
        tier: 'strong',
        score:
          0.65 * above(reflectionScore, 0.6) +
          0.2 * above(completionScore, 0.68) +
          0.05 * above(consistencyScore, 0.65) +
          0.1 * above(difficultyScore, 0.4),
      },
      {
        animal: 'Jaguar',
        title: 'Electric Jaguar',
        description: 'You still had a strong week, but it came in powerful bursts rather than a flat rhythm.',
        tier: 'strong',
        score:
          0.5 * above(dailyVariance, 0.45) +
          0.2 * above(completionScore, 0.68) +
          0.15 * above(activityScore, 0.7) +
          0.15 * above(recoveryScore, 0.55),
      },
    ];

    const best = strongCandidates.reduce((max, current) =>
      current.score > max.score ? current : max
    );

    if (best.score >= 0.62) {
      return {
        animal: best.animal,
        title: best.title,
        description: best.description,
        tier: best.tier,
      };
    }

    return {
      animal: 'Bear',
      title: 'Steady Bear',
      description: 'You had a strong week built on stable follow-through and dependable consistency.',
      tier: 'strong',
    };
  }

  if (tier === 'average') {
    const averageCandidates: Candidate[] = [
      {
        animal: 'Dog',
        title: 'Reliable Dog',
        description: 'You showed up with steady effort and built a dependable routine.',
        tier: 'average',
        score:
          0.45 * above(consistencyScore, 0.58) +
          0.35 * above(completionScore, 0.55) +
          0.2 * below(dailyVariance, 0.35),
      },
      {
        animal: 'Bunny',
        title: 'Energetic Bunny',
        description: 'You stayed engaged and active, even if the week was not perfectly even.',
        tier: 'average',
        score:
          0.5 * above(activityScore, 0.6) +
          0.2 * above(completionScore, 0.48) +
          0.15 * above(consistencyScore, 0.45) +
          0.15 * above(difficultyScore, 0.35),
      },
      {
        animal: 'Swan',
        title: 'Reflective Swan',
        description: 'You moved through the week with self-awareness and thoughtful check-ins.',
        tier: 'average',
        score:
          0.65 * above(reflectionScore, 0.5) +
          0.2 * above(completionScore, 0.45) +
          0.15 * above(consistencyScore, 0.45),
      },
      {
        animal: 'Fox',
        title: 'Adaptive Fox',
        description: 'You adjusted after setbacks and found ways to recover as the week went on.',
        tier: 'average',
        score:
          0.55 * above(recoveryScore, 0.58) +
          0.2 * above(completionScore, 0.45) +
          0.15 * above(consistencyScore, 0.45) +
          0.1 * above(dailyVariance, 0.3),
      },
    ];

    const best = averageCandidates.reduce((max, current) =>
      current.score > max.score ? current : max
    );

    if (best.score >= 0.58) {
      return {
        animal: best.animal,
        title: best.title,
        description: best.description,
        tier: best.tier,
      };
    }

    return {
      animal: 'Monkey',
      title: 'Flexible Monkey',
      description: 'Your week was mixed, adaptable, and still taking shape as you figured out your rhythm.',
      tier: 'average',
    };
  }

  const weakCandidates: Candidate[] = [
    {
      animal: 'Turtle',
      title: 'Patient Turtle',
      description: 'Your pace was slower, but there were still signs of steadiness underneath the week.',
      tier: 'weak',
      score:
        0.45 * above(consistencyScore, 0.28) +
        0.3 * near(completionScore, 0.38, 0.12) +
        0.25 * below(dailyVariance, 0.35),
    },
    {
      animal: 'Snail',
      title: 'Resetting Snail',
      description: 'This week was very light, and the focus was simply on getting started again.',
      tier: 'weak',
      score:
        0.45 * below(completionScore, 0.28) +
        0.3 * below(activityScore, 0.3) +
        0.15 * below(consistencyScore, 0.25) +
        0.1 * below(reflectionScore, 0.25),
    },
  ];

  const best = weakCandidates.reduce((max, current) =>
    current.score > max.score ? current : max
  );

  if (best.score >= 0.56) {
    return {
      animal: best.animal,
      title: best.title,
      description: best.description,
      tier: best.tier,
    };
  }

  return {
    animal: 'Sloth',
    title: 'Resting Sloth',
    description: 'The week moved gently, and your main focus was doing what you could without force.',
    tier: 'weak',
  };
}

// Building the final WeeklyRecap object

function roundPercent(value: number) {
  return Math.round(value * 100);
}

function getWeeklyHighlight(scores: WeeklyRecap['scores']) {
  if (scores.completionScore >= 0.7 && scores.consistencyScore >= 0.65) {
    return 'You stayed more consistent than earlier in the week and kept a strong rhythm.';
  }

  if (scores.recoveryScore >= 0.6) {
    return 'You bounced back well after lower days and kept your week moving.';
  }

  if (scores.dailyVariance >= 0.45) {
    return 'Your week had a few bigger swings, but it still revealed useful patterns.';
  }

  return 'This week was still taking shape, but your habits are beginning to form a pattern.';
}

export function buildWeeklyRecap(
  habits: HabitRecord[],
  checkIns: HabitCheckInRecord[],
  now = new Date()
): WeeklyRecap {
  const weekItems = buildWeekItems(habits, checkIns, now);

  const scores = {
    completionScore: computeCompletionScore(habits, checkIns, now),
    consistencyScore: computeConsistencyScore(habits, checkIns, now),
    streakScore: computeStreakScore(habits, checkIns, now),
    dailyVariance: computeDailyVariance(habits, checkIns, now),
    recoveryScore: computeRecoveryScore(habits, checkIns, now),
    activityScore: computeActivityScore(habits, checkIns, now),
    reflectionScore: computeReflectionScore(habits, checkIns, now),
    difficultyScore: computeDifficultyScore(habits, checkIns, now),
  };

  const archetype = selectArchetype(scores);

  const categoryBreakdown = computeCategoryBreakdown(habits, checkIns, now);
  const categoryEntries = Object.entries(categoryBreakdown);

  const sortedCategories = [...categoryEntries].sort((a, b) => b[1].ratio - a[1].ratio);
  const topCategory = sortedCategories[0];
  const weakestCategory = sortedCategories[sortedCategories.length - 1];

  const elapsedDays = getElapsedDaySummaries(habits, checkIns, now);
  const strongDays = elapsedDays.filter((d) => d.ratio >= 0.7).length;
  const bestDay = [...elapsedDays].sort((a, b) => b.ratio - a.ratio)[0];
  const weakDay = [...elapsedDays].sort((a, b) => a.ratio - b.ratio)[0];

  const avgDifficulty = computeAverageDifficulty(habits, checkIns, now);
  const difficultyLabel = getDifficultyLabel(avgDifficulty);

  const weekStart = startOfWeekSunday(now);
  const weekEnd = addDays(weekStart, 6);

  return {
    weekKey: getWeekKey(now),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    daysIncluded: elapsedDays.length,
    scores,
    weekItems,
    archetype,
    snapshots: {
      completionPulse: {
        percent: roundPercent(scores.completionScore),
        insight:
          scores.completionScore >= 0.7
            ? 'You followed through well on your habits so far this week.'
            : 'Your completion is still building as the week progresses.',
      },
      categoryLeader: {
        topCategory: topCategory?.[0] ?? 'N/A',
        topPercent: topCategory ? roundPercent(topCategory[1].ratio) : 0,
        weakestCategory: weakestCategory?.[0] ?? 'N/A',
        weakestPercent: weakestCategory ? roundPercent(weakestCategory[1].ratio) : 0,
        insight: topCategory
          ? `${topCategory[0]} is leading your week so far.`
          : 'Category trends will appear as more check-ins come in.',
      },
      rhythmCheck: {
        strongDays,
        bestDay: bestDay?.weekday ?? 'N/A',
        weakestDay: weakDay?.weekday ?? 'N/A',
        insight:
          scores.dailyVariance > 0.35
            ? 'Your rhythm has had some ups and downs this week.'
            : 'Your routine has stayed fairly steady so far.',
      },
      moodBoard: {
        averageDifficulty: avgDifficulty,
        label: difficultyLabel,
        insight:
          avgDifficulty == null
            ? 'Difficulty data will appear after rated check-ins.'
            : avgDifficulty >= 3.5
            ? 'This week has felt more demanding than usual.'
            : 'Your routines have felt manageable so far.',
      },
    },
    weeklyHighlight: getWeeklyHighlight(scores),
    aiSummaryStatus: 'coming_soon',
  };
}