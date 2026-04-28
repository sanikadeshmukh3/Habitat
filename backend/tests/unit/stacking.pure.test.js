// tests/unit/stacking.pure.test.js
//
// Unit tests for all pure (no-DB) functions in the habit stacking system.
//
// Functions under test:
//   consistencyService  →  getExpectedCompletions, hasCompletedObservationPeriod
//   tierService         →  assignTier, hasGracePeriodElapsed
//
// Run with: npm run test:unit
//
// NOTE: @prisma/client is mocked below purely to suppress the module-load
// instantiation error (services call `new PrismaClient()` at the top level).
// None of the tests in this file exercise any Prisma methods — the mock is
// inert and exists only to allow the import to succeed.

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const {
  getExpectedCompletions,
  hasCompletedObservationPeriod,
  OBSERVATION_WINDOW_DAYS,
  PRELIMINARY_CHECK_DAYS,
  PROVING_WINDOW_DAYS,
  PRELIMINARY_CHECK_THRESHOLD,
} = require('../../services/consistencyService');

const {
  assignTier,
  TIER_THRESHOLDS,
  hasGracePeriodElapsed,
} = require('../../services/tierService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a Date exactly `n` days in the past from now (midnight). */
function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Returns a Date exactly `n` days in the future from now (midnight). */
function daysFromNow(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

/** Builds a minimal habit object with sensible defaults. */
function makeHabit(overrides = {}) {
  return {
    id: 'habit-1',
    frequency: 'DAILY',
    observationWindowEnd: daysAgo(1),   // closed by default
    gracePeriodStart: null,
    ...overrides,
  };
}

// ─── Constants sanity checks ──────────────────────────────────────────────────
// These are not testing logic — they're asserting that the constants haven't
// been accidentally changed. If any of these fail, a threshold was modified
// and the tests (and docs) need to be updated to match.

describe('Stacking constants', () => {
  test('observation window is 30 days for DAILY habits', () => {
    expect(OBSERVATION_WINDOW_DAYS.DAILY).toBe(30);
  });

  test('observation window is 56 days for WEEKLY habits', () => {
    expect(OBSERVATION_WINDOW_DAYS.WEEKLY).toBe(56);
  });

  test('Tier 1 threshold is 85%', () => {
    expect(TIER_THRESHOLDS.TIER_1_MIN).toBe(0.85);
  });

  test('Tier 2 threshold is 65%', () => {
    expect(TIER_THRESHOLDS.TIER_2_MIN).toBe(0.65);
  });

  test('unlock threshold (preliminary check) is 40%', () => {
    expect(PRELIMINARY_CHECK_THRESHOLD).toBe(0.40);
  });

  test('Tier 2 proving window is 14 days for DAILY habits', () => {
    expect(PROVING_WINDOW_DAYS.TIER_2.DAILY).toBe(14);
  });

  test('Tier 3 proving window is 21 days for DAILY habits', () => {
    expect(PROVING_WINDOW_DAYS.TIER_3.DAILY).toBe(21);
  });

  test('preliminary check fires at day 15 for DAILY habits', () => {
    expect(PRELIMINARY_CHECK_DAYS.DAILY).toBe(15);
  });

  test('preliminary check fires at day 28 for WEEKLY habits', () => {
    expect(PRELIMINARY_CHECK_DAYS.WEEKLY).toBe(28);
  });
});

// ─── assignTier ───────────────────────────────────────────────────────────────

describe('assignTier', () => {

  // --- Tier 1 (Mastered) ---

  test('100% consistency → TIER_1', () => {
    expect(assignTier(1.0)).toBe('TIER_1');
  });

  test('exactly 85% → TIER_1 (at the boundary)', () => {
    expect(assignTier(0.85)).toBe('TIER_1');
  });

  test('90% → TIER_1', () => {
    expect(assignTier(0.90)).toBe('TIER_1');
  });

  // --- Tier 2 (Developing) ---

  test('84.9% → TIER_2 (just below Tier 1 boundary)', () => {
    expect(assignTier(0.849)).toBe('TIER_2');
  });

  test('75% → TIER_2 (midrange)', () => {
    expect(assignTier(0.75)).toBe('TIER_2');
  });

  test('exactly 65% → TIER_2 (at the Tier 2/3 boundary)', () => {
    expect(assignTier(0.65)).toBe('TIER_2');
  });

  // --- Tier 3 (Struggling) ---

  test('64.9% → TIER_3 (just below Tier 2 boundary)', () => {
    expect(assignTier(0.649)).toBe('TIER_3');
  });

  test('50% → TIER_3 (midrange struggling)', () => {
    expect(assignTier(0.50)).toBe('TIER_3');
  });

  test('0% → TIER_3 (never completed)', () => {
    expect(assignTier(0.0)).toBe('TIER_3');
  });
});

// ─── getExpectedCompletions ───────────────────────────────────────────────────

describe('getExpectedCompletions', () => {

  // --- DAILY frequency ---

  test('DAILY: 30-day window → 30 expected completions', () => {
    expect(getExpectedCompletions('DAILY', daysAgo(30), daysAgo(0))).toBe(30);
  });

  test('DAILY: 1-day window → 1 expected completion', () => {
    expect(getExpectedCompletions('DAILY', daysAgo(1), daysAgo(0))).toBe(1);
  });

  test('DAILY: same start and end → 0 expected completions', () => {
    const now = new Date();
    expect(getExpectedCompletions('DAILY', now, now)).toBe(0);
  });

  test('DAILY: 15-day window (halfway) → 15 expected completions', () => {
    expect(getExpectedCompletions('DAILY', daysAgo(15), daysAgo(0))).toBe(15);
  });

  // --- WEEKLY frequency ---

  test('WEEKLY: 56-day window → 8 expected completions', () => {
    expect(getExpectedCompletions('WEEKLY', daysAgo(56), daysAgo(0))).toBe(8);
  });

  test('WEEKLY: 7-day window → 1 expected completion', () => {
    expect(getExpectedCompletions('WEEKLY', daysAgo(7), daysAgo(0))).toBe(1);
  });

  test('WEEKLY: 6-day window → 0 expected completions (less than a full week)', () => {
    expect(getExpectedCompletions('WEEKLY', daysAgo(6), daysAgo(0))).toBe(0);
  });

  test('WEEKLY: 30-day window → 4 expected completions (floors partial week)', () => {
    expect(getExpectedCompletions('WEEKLY', daysAgo(30), daysAgo(0))).toBe(4);
  });

  // --- Unknown/fallback frequency ---

  test('unknown frequency falls back to treating like DAILY', () => {
    expect(getExpectedCompletions('MONTHLY', daysAgo(30), daysAgo(0))).toBe(30);
  });
});

// ─── hasCompletedObservationPeriod ───────────────────────────────────────────

describe('hasCompletedObservationPeriod', () => {

  test('window end is in the future → period NOT complete', () => {
    const habit = makeHabit({ observationWindowEnd: daysFromNow(10) });
    expect(hasCompletedObservationPeriod(habit)).toBe(false);
  });

  test('window end is tomorrow → period NOT complete', () => {
    const habit = makeHabit({ observationWindowEnd: daysFromNow(1) });
    expect(hasCompletedObservationPeriod(habit)).toBe(false);
  });

  test('window end is yesterday → period IS complete', () => {
    const habit = makeHabit({ observationWindowEnd: daysAgo(1) });
    expect(hasCompletedObservationPeriod(habit)).toBe(true);
  });

  test('window end is 30 days ago → period IS complete', () => {
    const habit = makeHabit({ observationWindowEnd: daysAgo(30) });
    expect(hasCompletedObservationPeriod(habit)).toBe(true);
  });
});

// ─── hasGracePeriodElapsed ────────────────────────────────────────────────────
// Grace period: 14 days from gracePeriodStart.
// A previously TIER_1 habit gets this grace window before stacking intervention triggers.

describe('hasGracePeriodElapsed', () => {

  test('no grace period started → returns false', () => {
    const habit = makeHabit({ gracePeriodStart: null });
    expect(hasGracePeriodElapsed(habit)).toBe(false);
  });

  test('grace period started today → not elapsed', () => {
    const habit = makeHabit({ gracePeriodStart: new Date() });
    expect(hasGracePeriodElapsed(habit)).toBe(false);
  });

  test('grace period started 13 days ago → not elapsed (still within window)', () => {
    const habit = makeHabit({ gracePeriodStart: daysAgo(13) });
    expect(hasGracePeriodElapsed(habit)).toBe(false);
  });

  test('grace period started exactly 14 days ago → elapsed (boundary)', () => {
    const habit = makeHabit({ gracePeriodStart: daysAgo(14) });
    expect(hasGracePeriodElapsed(habit)).toBe(true);
  });

  test('grace period started 15 days ago → elapsed', () => {
    const habit = makeHabit({ gracePeriodStart: daysAgo(15) });
    expect(hasGracePeriodElapsed(habit)).toBe(true);
  });

  test('grace period started 30 days ago → elapsed', () => {
    const habit = makeHabit({ gracePeriodStart: daysAgo(30) });
    expect(hasGracePeriodElapsed(habit)).toBe(true);
  });
});