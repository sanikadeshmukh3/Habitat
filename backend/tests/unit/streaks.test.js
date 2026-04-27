// tests/unit/streaks.test.js

const {
  diffDays,
  computePointsEarned,
  computeDailyCheckIn,
  evaluateDailyStreakHealth,
  computeWeeklyCheckIn,
  evaluateWeeklyStreakHealth,
  recalculateDailyStreak,
  recalculateWeeklyStreak,
} = require('../../lib/streaks');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a plain Date at midnight for a given offset from today. */
function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function today() { return daysAgo(0); }

// ─── diffDays ─────────────────────────────────────────────────────────────────

/**
 * diffDays(a, b) returns the positive integer number of calendar days between
 * two dates (a − b). It is used throughout the streak logic to determine how
 * long ago the last check-in occurred.
 */
describe('diffDays', () => {
  /**
   * When both dates fall on the same calendar day the difference is 0.
   * This matters because a second check-in on the same day must not break
   * the streak or start a new one.
   */
  test('same day returns 0', () => {
    expect(diffDays(today(), today())).toBe(0);
  });

  /**
   * A date that is one calendar day in the past must return exactly 1.
   * This is the "consecutive day" boundary used in computeDailyCheckIn.
   */
  test('yesterday returns 1', () => {
    expect(diffDays(today(), daysAgo(1))).toBe(1);
  });

  /**
   * Verifies the function handles larger gaps correctly; used as a sanity
   * check that the millisecond arithmetic doesn't drift over a week.
   */
  test('7 days ago returns 7', () => {
    expect(diffDays(today(), daysAgo(7))).toBe(7);
  });
});

// ─── computePointsEarned ──────────────────────────────────────────────────────

/**
 * computePointsEarned(newStreak) implements the formula:
 *   points = 1 + floor(log2(streak))
 *
 * Points grow logarithmically so early streaks feel rewarding while preventing
 * infinite inflation at very high streaks.
 */
describe('computePointsEarned', () => {
  /**
   * A brand-new streak of 1 earns exactly 1 point — the minimum reward for
   * any completed check-in.
   */
  test('streak of 1 → 1 point', () => {
    expect(computePointsEarned(1)).toBe(1);
  });

  /**
   * Streak 2 is the first step up: 1 + floor(log2(2)) = 1 + 1 = 2.
   */
  test('streak of 2 → 2 points (1 + log2(2)=1)', () => {
    expect(computePointsEarned(2)).toBe(2);
  });

  /**
   * Streak 4: 1 + floor(log2(4)) = 1 + 2 = 3. Verifies a clean power-of-two
   * boundary.
   */
  test('streak of 4 → 3 points (1 + log2(4)=2)', () => {
    expect(computePointsEarned(4)).toBe(3);
  });

  /**
   * Streak 5 is NOT a power of two; floor(log2(5)) = 2, so the result is
   * still 3. Confirms the floor truncation works between boundaries.
   */
  test('streak of 5 → 3 points (1 + floor(log2(5))=2)', () => {
    expect(computePointsEarned(5)).toBe(3);
  });

  /**
   * Streak 8: 1 + floor(log2(8)) = 1 + 3 = 4. Clean power-of-two boundary
   * used by the service test that verifies the stored pointsEarned value.
   */
  test('streak of 8 → 4 points (1 + log2(8)=3)', () => {
    expect(computePointsEarned(8)).toBe(4);
  });

  /**
   * A streak of 0 is an edge-case guard: the function should never receive 0
   * in practice (streak resets to 1 on check-in), but must not crash or
   * return 0 points if it does.
   */
  test('streak of 0 still returns 1 (guard)', () => {
    expect(computePointsEarned(0)).toBe(1);
  });
});

// ─── computeDailyCheckIn ─────────────────────────────────────────────────────

/**
 * computeDailyCheckIn is the incremental streak engine for daily habits.
 * It is called each time a check-in is saved (completed=true) and decides
 * whether the streak grows, continues via probation recovery, or resets.
 */
describe('computeDailyCheckIn', () => {
  /**
   * When lastCompletedDate is null the user has never checked in before.
   * The function must start the streak at 1 with no probation and no break.
   */
  test('first ever check-in starts streak at 1', () => {
    const result = computeDailyCheckIn(0, null, null, today());
    expect(result).toEqual({ newStreak: 1, newStreakProbationPeriodStart: null, streakBroke: false });
  });

  /**
   * Checking in the day after the last completed date is the ideal case.
   * The streak increments by 1 and no probation is involved.
   */
  test('consecutive day increments streak', () => {
    const result = computeDailyCheckIn(5, null, daysAgo(1), today());
    expect(result.newStreak).toBe(6);
    expect(result.streakBroke).toBe(false);
  });

  /**
   * Checking in twice on the same day (daysDiff === 0) is treated identically
   * to a consecutive day (daysDiff <= 1). The streak increments; no duplicate
   * check-in rejection happens at this layer (the service guards against that
   * separately). This test confirms the boundary condition.
   */
  test('same day check-in increments streak (idempotent guard)', () => {
    // daysDiff === 0, treated as ≤ 1
    const result = computeDailyCheckIn(3, null, today(), today());
    expect(result.newStreak).toBe(4);
  });

  /**
   * daysDiff === 2 with no active probation means the user missed exactly one
   * day and had not already entered probation. The streak must break and reset
   * to 1 because the probation window was never opened.
   */
  test('missing one day resets streak when no probation was active', () => {
    // daysDiff === 2, no probation → streak breaks
    const result = computeDailyCheckIn(10, null, daysAgo(2), today());
    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(true);
  });

  /**
   * daysDiff === 2 WITH an active probation means the user missed one day,
   * the probation clock was already started (by evaluateDailyStreakHealth at
   * read time), and they are now recovering within the window. The streak
   * continues and probation clears.
   */
  test('recovering within probation continues the streak', () => {
    // daysDiff === 2 AND probation is set → user is recovering
    const result = computeDailyCheckIn(10, daysAgo(1), daysAgo(2), today());
    expect(result.newStreak).toBe(11);
    expect(result.streakBroke).toBe(false);
    expect(result.newStreakProbationPeriodStart).toBeNull(); // probation clears
  });

  /**
   * Missing 3 or more days is unambiguously a streak break regardless of
   * probation state, because even the probation window (1 day) has expired.
   */
  test('missing 3+ days always resets streak', () => {
    const result = computeDailyCheckIn(10, null, daysAgo(3), today());
    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(true);
  });
});

// ─── evaluateDailyStreakHealth ────────────────────────────────────────────────

/**
 * evaluateDailyStreakHealth is called at read time (e.g. when the habit detail
 * screen loads) to detect whether the streak has silently degraded since the
 * last write. It tells the caller whether to show the ⏰ banner, and whether
 * to write a streak reset or probation start back to the DB.
 */
describe('evaluateDailyStreakHealth', () => {
  /**
   * Checking in today means daysDiff === 0 — the streak is healthy and
   * no probation or break state should be returned.
   */
  test('checked in today → healthy, no probation', () => {
    const h = evaluateDailyStreakHealth(5, null, today(), today());
    expect(h).toEqual({ inProbationPeriod: false, streakBroken: false, newStreakProbationPeriodStart: null });
  });

  /**
   * Checking in yesterday means daysDiff === 1 — still within the consecutive
   * window, so the streak is healthy and no action is needed.
   */
  test('checked in yesterday → healthy', () => {
    const h = evaluateDailyStreakHealth(5, null, daysAgo(1), today());
    expect(h.inProbationPeriod).toBe(false);
    expect(h.streakBroken).toBe(false);
  });

  /**
   * daysDiff === 2 with no probation set means the user missed exactly one day
   * and this is the first time the system has noticed. Probation begins now;
   * newStreakProbationPeriodStart must be non-null so the caller writes it back.
   */
  test('missed 1 day, no probation yet → enters probation', () => {
    const h = evaluateDailyStreakHealth(5, null, daysAgo(2), today());
    expect(h.inProbationPeriod).toBe(true);
    expect(h.streakBroken).toBe(false);
    expect(h.newStreakProbationPeriodStart).not.toBeNull();
  });

  /**
   * Probation was already set yesterday and we are still within the 1-day
   * recovery window. The streak is not yet broken; the client should still
   * show the ⏰ banner to prompt the user to check in.
   */
  test('in probation, still within window → stays in probation', () => {
    const h = evaluateDailyStreakHealth(5, daysAgo(1), daysAgo(2), today());
    expect(h.inProbationPeriod).toBe(true);
    expect(h.streakBroken).toBe(false);
  });

  /**
   * Probation was set 2+ days ago; the recovery window has expired without a
   * check-in. The streak is now definitively broken and must be reset to 0.
   */
  test('probation expired (2+ days) → streak broken', () => {
    const h = evaluateDailyStreakHealth(5, daysAgo(2), daysAgo(3), today());
    expect(h.streakBroken).toBe(true);
    expect(h.inProbationPeriod).toBe(false);
  });

  /**
   * A streak of 0 means the habit has never been completed or was already
   * reset. Nothing to evaluate — all fields should be false/null.
   */
  test('streak of 0 → always healthy', () => {
    const h = evaluateDailyStreakHealth(0, null, null, today());
    expect(h).toEqual({ inProbationPeriod: false, streakBroken: false, newStreakProbationPeriodStart: null });
  });

  /**
   * Missing 4 days with no probation set at all means the user went completely
   * dark. The streak must be broken regardless of whether probation was set,
   * because the gap is far beyond the 1-day recovery window.
   */
  test('missed 4 days with no probation → streak broken', () => {
    const h = evaluateDailyStreakHealth(5, null, daysAgo(4), today());
    expect(h.streakBroken).toBe(true);
  });
});

// ─── computeWeeklyCheckIn ────────────────────────────────────────────────────

/**
 * computeWeeklyCheckIn is the incremental streak engine for weekly habits.
 * Any single check-in within a calendar week counts for that week; consecutive
 * weeks with at least one check-in build the streak.
 */
describe('computeWeeklyCheckIn', () => {
  /**
   * An empty history means this is the user's first check-in for a weekly
   * habit. The streak starts at 1.
   */
  test('first ever check-in starts streak at 1', () => {
    const result = computeWeeklyCheckIn(0, [], today());
    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(false);
  });

  /**
   * If a prior check-in already exists within the same ISO week, a second
   * check-in must not increment the streak. alreadyCompletedThisWeek is true
   * and newStreak equals the current streak unchanged.
   */
  test('second check-in in the same week does not increment streak', () => {
    const result = computeWeeklyCheckIn(3, [daysAgo(2)], today());
    expect(result.alreadyCompletedThisWeek).toBe(true);
    expect(result.newStreak).toBe(3); // unchanged
  });

  /**
   * A prior check-in 7 days ago falls in the previous ISO week. As long as
   * that week is directly before the current week, the streak increments.
   */
  test('check-in after consecutive week increments streak', () => {
    const result = computeWeeklyCheckIn(4, [daysAgo(7)], today());
    expect(result.newStreak).toBe(5);
    expect(result.streakBroke).toBe(false);
  });

  /**
   * A prior check-in 14 days ago skips a full ISO week. The streak resets to 1
   * and streakBroke is true so the client can show a break notification.
   */
  test('check-in after skipping a full week breaks streak', () => {
    const result = computeWeeklyCheckIn(4, [daysAgo(14)], today());
    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(true);
  });
});

// ─── evaluateWeeklyStreakHealth ───────────────────────────────────────────────

/**
 * evaluateWeeklyStreakHealth is called at read time for weekly habits. Because
 * weekly habits have a full week of buffer there is no probation concept — a
 * missed week simply breaks the streak.
 */
describe('evaluateWeeklyStreakHealth', () => {
  /**
   * A streak of 0 or no last completed date means there is nothing to
   * evaluate. streakBroken must be false.
   */
  test('no check-ins → not broken', () => {
    const h = evaluateWeeklyStreakHealth(0, null, today());
    expect(h.streakBroken).toBe(false);
  });

  /**
   * A check-in within the current week keeps the streak intact. Even if it
   * was 3 days ago, both dates fall in the same ISO week.
   */
  test('checked in this week → not broken', () => {
    const h = evaluateWeeklyStreakHealth(3, daysAgo(3), today());
    expect(h.streakBroken).toBe(false);
  });

  /**
   * A check-in from last week is still valid because users have the full
   * current week to check in before the streak breaks. Streak is healthy.
   */
  test('checked in last week → not broken', () => {
    const h = evaluateWeeklyStreakHealth(3, daysAgo(7), today());
    expect(h.streakBroken).toBe(false);
  });

  /**
   * A check-in from 2+ weeks ago means an entire week passed with no
   * activity. The streak is broken and should be reset to 0 by the caller.
   */
  test('checked in 2+ weeks ago → broken', () => {
    const h = evaluateWeeklyStreakHealth(3, daysAgo(14), today());
    expect(h.streakBroken).toBe(true);
  });
});

// ─── recalculateDailyStreak ───────────────────────────────────────────────────

/**
 * recalculateDailyStreak walks backwards from today through the provided dates
 * and counts how many consecutive days have a completed check-in. It is used
 * after an uncheck so the streak reflects the actual remaining history rather
 * than an incremental guess.
 *
 * When habitCreatedAt is provided, only dates on or after that value are
 * considered, preventing backdated check-ins from farming streak credit.
 */
describe('recalculateDailyStreak', () => {
  /**
   * Three consecutive completed dates ending today should produce a streak of 3.
   * Verifies the basic backwards-walking logic works correctly.
   */
  test('counts consecutive days ending today', () => {
    const dates = [today(), daysAgo(1), daysAgo(2)];
    expect(recalculateDailyStreak(dates, today()).streak).toBe(3);
  });

  /**
   * A gap in the date sequence (missing day 2) must stop the count at that
   * point even if older dates exist. The streak from today is 2, not 3.
   */
  test('stops counting at the first gap', () => {
    const dates = [today(), daysAgo(1), daysAgo(3)]; // gap at day 2
    expect(recalculateDailyStreak(dates, today()).streak).toBe(2);
  });

  /**
   * The primary bug this fix addresses: when today's check-in is unchecked,
   * today is absent from the remaining dates. The cursor must slide back to
   * yesterday and count forward from there — not break immediately and return 0.
   * Remaining dates are yesterday, 2 days ago, 3 days ago → streak = 3.
   */
  test('counts consecutive days ending yesterday when today was unchecked', () => {
    const dates = [daysAgo(1), daysAgo(2), daysAgo(3)];
    expect(recalculateDailyStreak(dates, today()).streak).toBe(3);
  });

  /**
   * If neither today nor yesterday has a check-in, the streak is genuinely
   * broken and must return 0 regardless of older history. The one-day slide
   * must not cascade further back.
   */
  test('returns 0 when neither today nor yesterday has a check-in', () => {
    const dates = [daysAgo(3), daysAgo(4), daysAgo(5)];
    expect(recalculateDailyStreak(dates, today()).streak).toBe(0);
  });

  /**
   * An empty date array means no completed check-ins remain. The streak must
   * be 0 (not an error).
   */
  test('returns 0 when no completed dates are provided', () => {
    expect(recalculateDailyStreak([], today()).streak).toBe(0);
  });

  /**
   * When habitCreatedAt is provided, dates strictly before that threshold are
   * excluded before counting. Here, dates 5 and 10 days ago predate the habit
   * and must not contribute to the streak even though they are consecutive with
   * earlier dates. Only today, yesterday, and 2 days ago qualify → streak = 3.
   */
  test('filters out dates before habitCreatedAt', () => {
    const createdAt = daysAgo(2);
    const dates = [today(), daysAgo(1), daysAgo(2), daysAgo(5), daysAgo(10)];
    expect(recalculateDailyStreak(dates, today(), createdAt).streak).toBe(3);
  });

  /**
   * If every completed date falls before the habit creation date, none of them
   * are eligible and the streak is 0. This guards against a user who backdates
   * all their check-ins before the habit was created.
   */
  test('streak is 0 if all completed dates precede habitCreatedAt', () => {
    const createdAt = today(); // created today, all check-ins are "yesterday or earlier"
    const dates = [daysAgo(5), daysAgo(6), daysAgo(7)];
    expect(recalculateDailyStreak(dates, today(), createdAt).streak).toBe(0);
  });
});

// ─── recalculateWeeklyStreak ──────────────────────────────────────────────────

/**
 * recalculateWeeklyStreak collapses all completed dates into their ISO weeks
 * and counts backwards through consecutive weeks that have at least one entry.
 * Like its daily counterpart it accepts an optional habitCreatedAt to exclude
 * pre-creation dates.
 */
describe('recalculateWeeklyStreak', () => {
  /**
   * Dates in three consecutive weeks ending this week should produce a streak
   * of 3. Confirms the basic ISO-week grouping and consecutive-week logic work.
   */
  test('counts consecutive weeks ending this or last week', () => {
    const dates = [today(), daysAgo(7), daysAgo(14)];
    expect(recalculateWeeklyStreak(dates, today()).streak).toBe(3);
  });

  /**
   * An empty date array must return 0 without throwing.
   */
  test('returns 0 when no completed dates are provided', () => {
    expect(recalculateWeeklyStreak([], today()).streak).toBe(0);
  });

  /**
   * When habitCreatedAt is provided, dates before it are excluded. Here the
   * habit was created 7 days ago; only today (this week) and 7 days ago (last
   * week) qualify. The date 14 days ago is pre-creation and must be ignored,
   * resulting in a streak of 2, not 3.
   */
  test('filters out dates before habitCreatedAt', () => {
    const createdAt = daysAgo(7); // created exactly 1 week ago
    const dates = [today(), daysAgo(7), daysAgo(14)]; // 3rd date is pre-creation
    expect(recalculateWeeklyStreak(dates, today(), createdAt).streak).toBe(2);
  });

  /**
   * If all dates fall before the habit creation date, none are eligible and
   * the streak is 0. Guards against a user who backdates all check-ins.
   */
  test('streak is 0 if all completed dates precede habitCreatedAt', () => {
    const createdAt = today();
    const dates = [daysAgo(14), daysAgo(21)];
    expect(recalculateWeeklyStreak(dates, today(), createdAt).streak).toBe(0);
  });
});