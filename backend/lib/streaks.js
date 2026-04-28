/**
 * lib/streaks.js
 *
 * Pure functions for streak computation. No DB calls — takes raw data in,
 * returns new state out.
 *
 * Daily streak rules:
 *   - Check in on consecutive days → streak increments.
 *   - Miss 1 day → probation period begins, streak stays, clock emoji shown on client.
 *   - Check in within probation (the day after the missed day) → streak continues, probation clears.
 *   - Miss a 2nd day while in probation → streak resets to 0.
 *
 * Weekly streak rules:
 *   - Any check-in within a calendar week counts for that week.
 *   - Consecutive weeks with at least one check-in → streak increments.
 *   - A week with no check-in → streak resets to 0.
 *
 * Points formula (per check-in):
 *   points = 1 + floor(log2(newStreak))
 *   streak=1 → 1pt, streak=2 → 2pts, streak=4 → 3pts, streak=8 → 4pts
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip time from a date so comparisons are day-accurate. */
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Positive integer difference in calendar days between two dates (a − b). */
function diffDays(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / msPerDay);
}

/** ISO week descriptor — used for consecutive-week detection. */
function isoWeekOf(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // Shift to nearest Thursday (ISO week anchor)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const jan4 = new Date(date.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((date.getTime() - jan4.getTime()) / 86_400_000 -
        3 +
        ((jan4.getDay() + 6) % 7)) /
        7,
    );
  return { year: date.getFullYear(), week };
}

/** True if two ISO week descriptors are exactly one week apart. */
function isConsecutiveWeek(earlier, later) {
  if (later.year === earlier.year) {
    return later.week - earlier.week === 1;
  }
  if (later.year - earlier.year === 1) {
    const lastWeekOfEarlierYear = isoWeekOf(new Date(earlier.year, 11, 28)).week;
    return earlier.week === lastWeekOfEarlierYear && later.week === 1;
  }
  return false;
}

// ─── Points ───────────────────────────────────────────────────────────────────

/**
 * Points earned for a single check-in given the streak *after* that check-in.
 *   points = 1 + floor(log2(streak))
 * @param {number} newStreak
 * @returns {number}
 */
function computePointsEarned(newStreak) {
  if (newStreak <= 1) return 1;
  return 1 + Math.floor(Math.log2(newStreak));
}

// ─── Daily streak — check-in time ────────────────────────────────────────────

/**
 * Compute the new streak when a daily-habit check-in is saved (completed=true).
 *
 * @param {number}    currentStreak
 * @param {Date|null} streakProbationPeriodStart  - Habit.streakProbationPeriodStart
 * @param {Date|null} lastCompletedDate           - Most recent prior completed check-in
 * @param {Date}      [today]                     - Inject for testability
 * @returns {{ newStreak: number, newStreakProbationPeriodStart: Date|null, streakBroke: boolean }}
 */
function computeDailyCheckIn(
  currentStreak,
  streakProbationPeriodStart,
  lastCompletedDate,
  today = new Date(),
) {
  if (!lastCompletedDate) {
    // Very first check-in ever
    return { newStreak: 1, newStreakProbationPeriodStart: null, streakBroke: false };
  }

  const daysDiff = diffDays(today, lastCompletedDate);

  if (daysDiff <= 1) {
    // Same day or consecutive day — perfect continuity
    return { newStreak: currentStreak + 1, newStreakProbationPeriodStart: null, streakBroke: false };
  }

  if (daysDiff === 2 && streakProbationPeriodStart !== null) {
    // Missed exactly 1 day AND probation was already active → recovering within window
    return { newStreak: currentStreak + 1, newStreakProbationPeriodStart: null, streakBroke: false };
  }

  // daysDiff >= 2 without valid probation, or daysDiff >= 3 → streak is gone
  return { newStreak: 1, newStreakProbationPeriodStart: null, streakBroke: true };
}

// ─── Daily streak — read time ─────────────────────────────────────────────────

/**
 * Evaluate the health of a daily streak at read time (habit detail / dashboard load).
 * Call this whenever you fetch a habit — detects if the streak silently broke
 * or entered probation since the last check-in, and tells the caller what to write back.
 *
 * @param {number}    currentStreak
 * @param {Date|null} streakProbationPeriodStart
 * @param {Date|null} lastCompletedDate
 * @param {Date}      [today]
 * @returns {{ inProbationPeriod: boolean, streakBroken: boolean, newStreakProbationPeriodStart: Date|null }}
 */
function evaluateDailyStreakHealth(
  currentStreak,
  streakProbationPeriodStart,
  lastCompletedDate,
  today = new Date(),
) {
  const noop = { inProbationPeriod: false, streakBroken: false, newStreakProbationPeriodStart: null };

  if (currentStreak === 0 || !lastCompletedDate) return noop;

  const daysDiff = diffDays(today, lastCompletedDate);

  if (daysDiff <= 1) return noop; // checked in today or yesterday — all good

  if (daysDiff === 2 && streakProbationPeriodStart === null) {
    // Missed exactly 1 day, probation not set yet → enter probation now
    return {
      inProbationPeriod: true,
      streakBroken: false,
      newStreakProbationPeriodStart: startOfDay(today),
    };
  }

  if (streakProbationPeriodStart !== null) {
    const probationDiff = diffDays(today, streakProbationPeriodStart);
    if (probationDiff >= 2) {
      // Probation expired — streak is broken
      return { inProbationPeriod: false, streakBroken: true, newStreakProbationPeriodStart: null };
    }
    // Still within probation window
    return { inProbationPeriod: true, streakBroken: false, newStreakProbationPeriodStart: null };
  }

  // More than 2 days missed, no probation — streak is broken
  return { inProbationPeriod: false, streakBroken: true, newStreakProbationPeriodStart: null };
}

// ─── Weekly streak ────────────────────────────────────────────────────────────

/**
 * Compute the new streak when a weekly-habit check-in is saved.
 *
 * @param {number} currentStreak
 * @param {Date[]} allCompletedDates  - All prior completed check-in dates for this habit
 * @param {Date}   [today]
 * @returns {{ newStreak: number, streakBroke: boolean, alreadyCompletedThisWeek: boolean }}
 */
function computeWeeklyCheckIn(currentStreak, allCompletedDates, today = new Date()) {
  const thisWeek = isoWeekOf(today);

  const alreadyThisWeek = allCompletedDates.some((d) => {
    const w = isoWeekOf(d);
    return w.year === thisWeek.year && w.week === thisWeek.week;
  });

  if (alreadyThisWeek) {
    return { newStreak: currentStreak, streakBroke: false, alreadyCompletedThisWeek: true };
  }

  const priorWeeks = allCompletedDates
    .map(isoWeekOf)
    .filter((w) => !(w.year === thisWeek.year && w.week === thisWeek.week));

  if (priorWeeks.length === 0) {
    return { newStreak: 1, streakBroke: false, alreadyCompletedThisWeek: false };
  }

  const lastWeek = priorWeeks.sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.week - a.week,
  )[0];

  if (isConsecutiveWeek(lastWeek, thisWeek)) {
    return { newStreak: currentStreak + 1, streakBroke: false, alreadyCompletedThisWeek: false };
  }

  return { newStreak: 1, streakBroke: true, alreadyCompletedThisWeek: false };
}

/**
 * Evaluate weekly streak health at read time.
 *
 * @param {number}    currentStreak
 * @param {Date|null} lastCompletedDate
 * @param {Date}      [today]
 * @returns {{ streakBroken: boolean }}
 */
function evaluateWeeklyStreakHealth(currentStreak, lastCompletedDate, today = new Date()) {
  if (currentStreak === 0 || !lastCompletedDate) return { streakBroken: false };

  const thisWeek = isoWeekOf(today);
  const lastWeek = isoWeekOf(lastCompletedDate);

  if (thisWeek.year === lastWeek.year && thisWeek.week - lastWeek.week <= 1) {
    return { streakBroken: false };
  }
  if (isConsecutiveWeek(lastWeek, thisWeek)) {
    return { streakBroken: false };
  }

  return { streakBroken: true };
}

// ─── Full recalculation from history ─────────────────────────────────────────
// Used when a check-in is unchecked: we can't use the incremental logic
// because we don't know the streak at the time the check-in was originally
// made. Instead we walk backwards from today through all remaining completed
// dates and count consecutive hits.

/**
 * Recalculate a daily streak by walking backwards from the most recent
 * eligible day through an array of completed dates. Probation is not
 * considered here — a full recalculation always produces the strict
 * consecutive streak.
 *
 * Only dates on or after `habitCreatedAt` are counted. This prevents
 * backdated check-ins from inflating a streak beyond what the habit's
 * lifetime can support.
 *
 * @param {Date[]}    completedDates  All remaining completed check-in dates (any order)
 * @param {Date}      [today]
 * @param {Date|null} [habitCreatedAt] - If provided, dates strictly before this are excluded
 * @returns {{ streak: number }}
 */
function recalculateDailyStreak(completedDates, today = new Date(), habitCreatedAt = null) {
  // Filter out any dates that precede the habit's creation date.
  // The primary enforcement is the gte filter on the DB query in checkinService,
  // but this guard keeps the pure function correct when called directly.
  const eligible = habitCreatedAt
    ? completedDates.filter(
        (d) => startOfDay(new Date(d)) >= startOfDay(new Date(habitCreatedAt)),
      )
    : completedDates;

  const dayKeys = new Set(eligible.map((d) => toDateKey(d)));

  let streak = 0;
  const cursor = startOfDay(today);

  // If today has no completed check-in, slide back to yesterday before
  // counting. This handles the uncheck-today case: the remaining dates start
  // from yesterday, so the cursor must begin there rather than breaking
  // immediately on today's absence and returning 0.
  if (!dayKeys.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    if (dayKeys.has(toDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak };
}

/**
 * Recalculate a weekly streak by counting backwards through consecutive ISO
 * weeks that have at least one completed check-in.
 *
 * Only dates on or after `habitCreatedAt` are counted. This prevents
 * backdated check-ins from inflating a streak beyond what the habit's
 * lifetime can support.
 *
 * @param {Date[]}    completedDates
 * @param {Date}      [today]
 * @param {Date|null} [habitCreatedAt] - If provided, dates strictly before this are excluded
 * @returns {{ streak: number }}
 */
function recalculateWeeklyStreak(completedDates, today = new Date(), habitCreatedAt = null) {
  // Filter out any dates that precede the habit's creation date.
  // The primary enforcement is the gte filter on the DB query in checkinService,
  // but this guard keeps the pure function correct when called directly.
  const eligible = habitCreatedAt
    ? completedDates.filter(
        (d) => startOfDay(new Date(d)) >= startOfDay(new Date(habitCreatedAt)),
      )
    : completedDates;

  if (eligible.length === 0) return { streak: 0 };

  // Collect distinct completed weeks, sorted descending
  const weekSet = new Map();
  for (const d of eligible) {
    const w = isoWeekOf(d);
    const key = `${w.year}-${w.week}`;
    weekSet.set(key, w);
  }
  const sortedWeeks = Array.from(weekSet.values()).sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.week - a.week,
  );

  // The most recent completed week must be this week or last week to count
  const thisWeek = isoWeekOf(today);
  const mostRecent = sortedWeeks[0];
  const isCurrentOrLast =
    (mostRecent.year === thisWeek.year && thisWeek.week - mostRecent.week <= 1) ||
    isConsecutiveWeek(mostRecent, thisWeek);

  if (!isCurrentOrLast) return { streak: 0 };

  let streak = 1;
  for (let i = 1; i < sortedWeeks.length; i++) {
    if (isConsecutiveWeek(sortedWeeks[i], sortedWeeks[i - 1])) {
      streak++;
    } else {
      break;
    }
  }

  return { streak };
}

/** Format a Date as YYYY-MM-DD for set membership checks. */
function toDateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

module.exports = {
  diffDays,
  startOfDay,
  computePointsEarned,
  computeDailyCheckIn,
  evaluateDailyStreakHealth,
  computeWeeklyCheckIn,
  evaluateWeeklyStreakHealth,
  recalculateDailyStreak,
  recalculateWeeklyStreak,
};