// __tests__/streaks.test.js

const {
  diffDays,
  computePointsEarned,
  computeDailyCheckIn,
  evaluateDailyStreakHealth,
  computeWeeklyCheckIn,
  evaluateWeeklyStreakHealth,
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

describe('diffDays', () => {
  test('same day returns 0', () => {
    expect(diffDays(today(), today())).toBe(0);
  });

  test('yesterday returns 1', () => {
    expect(diffDays(today(), daysAgo(1))).toBe(1);
  });

  test('7 days ago returns 7', () => {
    expect(diffDays(today(), daysAgo(7))).toBe(7);
  });
});

// ─── computePointsEarned ──────────────────────────────────────────────────────

describe('computePointsEarned', () => {
  test('streak of 1 → 1 point', () => {
    expect(computePointsEarned(1)).toBe(1);
  });

  test('streak of 2 → 2 points (1 + log2(2)=1)', () => {
    expect(computePointsEarned(2)).toBe(2);
  });

  test('streak of 4 → 3 points (1 + log2(4)=2)', () => {
    expect(computePointsEarned(4)).toBe(3);
  });

  test('streak of 5 → 3 points (1 + floor(log2(5))=2)', () => {
    expect(computePointsEarned(5)).toBe(3);
  });

  test('streak of 8 → 4 points (1 + log2(8)=3)', () => {
    expect(computePointsEarned(8)).toBe(4);
  });

  test('streak of 0 still returns 1 (guard)', () => {
    expect(computePointsEarned(0)).toBe(1);
  });
});

// ─── computeDailyCheckIn ─────────────────────────────────────────────────────

describe('computeDailyCheckIn', () => {
  test('first ever check-in starts streak at 1', () => {
    const result = computeDailyCheckIn(0, null, null, today());
    expect(result).toEqual({ newStreak: 1, newStreakProbationPeriodStart: null, streakBroke: false });
  });

  test('consecutive day increments streak', () => {
    const result = computeDailyCheckIn(5, null, daysAgo(1), today());
    expect(result.newStreak).toBe(6);
    expect(result.streakBroke).toBe(false);
  });

  test('same day check-in increments streak (idempotent guard)', () => {
    // daysDiff === 0, treated as ≤ 1
    const result = computeDailyCheckIn(3, null, today(), today());
    expect(result.newStreak).toBe(4);
  });

  test('missing one day resets streak when no probation was active', () => {
    // daysDiff === 2, no probation → streak breaks
    const result = computeDailyCheckIn(10, null, daysAgo(2), today());
    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(true);
  });

  test('recovering within probation continues the streak', () => {
    // daysDiff === 2 AND probation is set → user is recovering
    const result = computeDailyCheckIn(10, daysAgo(1), daysAgo(2), today());
    expect(result.newStreak).toBe(11);
    expect(result.streakBroke).toBe(false);
    expect(result.newStreakProbationPeriodStart).toBeNull(); // probation clears
  });

  test('missing 3+ days always resets streak', () => {
    const result = computeDailyCheckIn(10, null, daysAgo(3), today());
    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(true);
  });
});

// ─── evaluateDailyStreakHealth ────────────────────────────────────────────────

describe('evaluateDailyStreakHealth', () => {
  test('checked in today → healthy, no probation', () => {
    const h = evaluateDailyStreakHealth(5, null, today(), today());
    expect(h).toEqual({ inProbationPeriod: false, streakBroken: false, newStreakProbationPeriodStart: null });
  });

  test('checked in yesterday → healthy', () => {
    const h = evaluateDailyStreakHealth(5, null, daysAgo(1), today());
    expect(h.inProbationPeriod).toBe(false);
    expect(h.streakBroken).toBe(false);
  });

  test('missed 1 day, no probation yet → enters probation', () => {
    const h = evaluateDailyStreakHealth(5, null, daysAgo(2), today());
    expect(h.inProbationPeriod).toBe(true);
    expect(h.streakBroken).toBe(false);
    expect(h.newStreakProbationPeriodStart).not.toBeNull();
  });

  test('in probation, still within window → stays in probation', () => {
    const h = evaluateDailyStreakHealth(5, daysAgo(1), daysAgo(2), today());
    expect(h.inProbationPeriod).toBe(true);
    expect(h.streakBroken).toBe(false);
  });

  test('probation expired (2+ days) → streak broken', () => {
    const h = evaluateDailyStreakHealth(5, daysAgo(2), daysAgo(3), today());
    expect(h.streakBroken).toBe(true);
    expect(h.inProbationPeriod).toBe(false);
  });

  test('streak of 0 → always healthy', () => {
    const h = evaluateDailyStreakHealth(0, null, null, today());
    expect(h).toEqual({ inProbationPeriod: false, streakBroken: false, newStreakProbationPeriodStart: null });
  });

  test('missed 4 days with no probation → streak broken', () => {
    const h = evaluateDailyStreakHealth(5, null, daysAgo(4), today());
    expect(h.streakBroken).toBe(true);
  });
});

// ─── computeWeeklyCheckIn ────────────────────────────────────────────────────

describe('computeWeeklyCheckIn', () => {
  test('first ever check-in starts streak at 1', () => {
    const result = computeWeeklyCheckIn(0, [], today());
    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(false);
  });

  test('second check-in in the same week does not increment streak', () => {
    const result = computeWeeklyCheckIn(3, [daysAgo(2)], today());
    expect(result.alreadyCompletedThisWeek).toBe(true);
    expect(result.newStreak).toBe(3); // unchanged
  });

  test('check-in after consecutive week increments streak', () => {
    const result = computeWeeklyCheckIn(4, [daysAgo(7)], today());
    expect(result.newStreak).toBe(5);
    expect(result.streakBroke).toBe(false);
  });

  test('check-in after skipping a full week breaks streak', () => {
    const result = computeWeeklyCheckIn(4, [daysAgo(14)], today());
    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(true);
  });
});

// ─── evaluateWeeklyStreakHealth ───────────────────────────────────────────────

describe('evaluateWeeklyStreakHealth', () => {
  test('no check-ins → not broken', () => {
    const h = evaluateWeeklyStreakHealth(0, null, today());
    expect(h.streakBroken).toBe(false);
  });

  test('checked in this week → not broken', () => {
    const h = evaluateWeeklyStreakHealth(3, daysAgo(3), today());
    expect(h.streakBroken).toBe(false);
  });

  test('checked in last week → not broken', () => {
    const h = evaluateWeeklyStreakHealth(3, daysAgo(7), today());
    expect(h.streakBroken).toBe(false);
  });

  test('checked in 2+ weeks ago → broken', () => {
    const h = evaluateWeeklyStreakHealth(3, daysAgo(14), today());
    expect(h.streakBroken).toBe(true);
  });
});