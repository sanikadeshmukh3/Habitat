// tests/unit/stacking.consistency.test.js
//
// Unit tests for the DB-dependent functions in consistencyService.
// Prisma is fully mocked — no database connection required.
//
// Functions under test:
//   calculateConsistencyScore     — scores a habit over an explicit date range
//   shouldSendPreliminaryCheckIn  — decides whether the halfway welfare nudge should fire
//
// Mock architecture:
//   mockDb is a plain object with jest.fn() methods that stands in for the
//   PrismaClient instance. Jest's hoisting rules allow variables prefixed with
//   "mock" to be referenced inside jest.mock factories, which is why this works
//   even though jest.mock is hoisted to the top of the file.
//
//   NOTE: shouldSendPreliminaryCheckIn calls prisma.habit.findUnique twice —
//   once in its own body, and again internally via calculateConsistencyScore.
//   Both calls get the same mockResolvedValue, which is what we want.
//
// Date handling note:
//   daysAgo(n) returns midnight on day N. For calculateConsistencyScore tests,
//   always use daysAgo(0) as the end date — never new Date() — so both endpoints
//   are at midnight and the day difference is a clean integer.
//
//   For shouldSendPreliminaryCheckIn, the function uses new Date() internally
//   so the denominator (expected completions) may be 20 or 21 depending on time
//   of day. Boundary tests are written with comfortable margins to stay stable.
//
// Run with: npm run test:unit

const mockDb = {
  habit: {
    findUnique: jest.fn(),
    update:     jest.fn(),
  },
  habitCheckIn: {
    findMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockDb),
}));

const {
  calculateConsistencyScore,
  shouldSendPreliminaryCheckIn,
} = require('../../services/consistencyService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

/** Builds n check-in objects, all marked completed. */
function completedCheckIns(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `ci-${i}`, completed: true }));
}

/** Builds n check-in objects, all marked incomplete. */
function missedCheckIns(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `ci-${i}`, completed: false }));
}

/** Builds a mix: `done` completed + `missed` incomplete. */
function mixedCheckIns(done, missed) {
  return [
    ...completedCheckIns(done),
    ...missedCheckIns(missed),
  ];
}

/** Minimal habit object. Defaults to DAILY, observation window open. */
function makeHabit(overrides = {}) {
  return {
    id:                   'habit-1',
    frequency:            'DAILY',
    createdAt:            daysAgo(30),
    observationWindowEnd: daysFromNow(1),
    gentleNudgeSentAt:    null,
    consistencyScore:     null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── calculateConsistencyScore ────────────────────────────────────────────────

describe('calculateConsistencyScore', () => {

  test('throws 404 when the habit does not exist', async () => {
    mockDb.habit.findUnique.mockResolvedValue(null);

    await expect(
      calculateConsistencyScore('nonexistent', daysAgo(30), daysAgo(0))
    ).rejects.toMatchObject({ status: 404 });
  });

  test('returns 0 when there are no check-ins at all', async () => {
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'DAILY' }));
    mockDb.habitCheckIn.findMany.mockResolvedValue([]);

    const score = await calculateConsistencyScore('habit-1', daysAgo(30), daysAgo(0));
    expect(score).toBe(0);
  });

  test('returns 0 when all check-ins are marked incomplete', async () => {
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'DAILY' }));
    mockDb.habitCheckIn.findMany.mockResolvedValue(missedCheckIns(30));

    const score = await calculateConsistencyScore('habit-1', daysAgo(30), daysAgo(0));
    expect(score).toBe(0);
  });

  test('returns 1.0 when every check-in is completed (100%)', async () => {
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'DAILY' }));
    mockDb.habitCheckIn.findMany.mockResolvedValue(completedCheckIns(30));

    const score = await calculateConsistencyScore('habit-1', daysAgo(30), daysAgo(0));
    expect(score).toBe(1.0);
  });

  test('caps at 1.0 even if completed count exceeds expected (over-completion guard)', async () => {
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'DAILY' }));
    // 40 completed check-ins in a 30-day window — impossible in practice but the cap must hold
    mockDb.habitCheckIn.findMany.mockResolvedValue(completedCheckIns(40));

    const score = await calculateConsistencyScore('habit-1', daysAgo(30), daysAgo(0));
    expect(score).toBe(1.0);
  });

  test('returns 0.8 for 24 completed out of 30 expected (unlock threshold boundary)', async () => {
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'DAILY' }));
    mockDb.habitCheckIn.findMany.mockResolvedValue(mixedCheckIns(24, 6));

    const score = await calculateConsistencyScore('habit-1', daysAgo(30), daysAgo(0));
    expect(score).toBeCloseTo(0.8);
  });

  test('returns ~0.867 for 26 of 30 completed (just above Tier 1 threshold of 85%)', async () => {
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'DAILY' }));
    mockDb.habitCheckIn.findMany.mockResolvedValue(mixedCheckIns(26, 4));

    const score = await calculateConsistencyScore('habit-1', daysAgo(30), daysAgo(0));
    expect(score).toBeCloseTo(0.867, 2);
  });

  test('returns 0 when date range is zero-length (expectedCount = 0 guard)', async () => {
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'DAILY' }));
    mockDb.habitCheckIn.findMany.mockResolvedValue([]);

    const today = daysAgo(0);
    const score = await calculateConsistencyScore('habit-1', today, today);
    expect(score).toBe(0);
  });

  test('WEEKLY: 5 of 8 expected completions → 0.625 (just below Tier 2 boundary)', async () => {
    // 56-day window, WEEKLY frequency → 8 expected completions
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'WEEKLY' }));
    mockDb.habitCheckIn.findMany.mockResolvedValue(mixedCheckIns(5, 3));

    const score = await calculateConsistencyScore('habit-1', daysAgo(56), daysAgo(0));
    expect(score).toBeCloseTo(0.625, 2);
  });

  test('WEEKLY: 8 completed out of 8 expected → 1.0', async () => {
    mockDb.habit.findUnique.mockResolvedValue(makeHabit({ frequency: 'WEEKLY' }));
    mockDb.habitCheckIn.findMany.mockResolvedValue(completedCheckIns(8));

    const score = await calculateConsistencyScore('habit-1', daysAgo(56), daysAgo(0));
    expect(score).toBe(1.0);
  });
});

// ─── shouldSendPreliminaryCheckIn ────────────────────────────────────────────
// Fires when ALL of the following are true:
//   - observation window is still open
//   - nudge has not already been sent
//   - halfway point has passed (day 15 for DAILY, day 28 for WEEKLY)
//   - current consistency score is below 40%
//
// NOTE: this function calls new Date() internally, so the expected completion
// count for a 20-day-old habit may be 20 or 21 depending on time of day.
// Tests use check-in counts with comfortable margins away from the 40% boundary,
// and createdAt dates with a day of margin away from the halfway boundary.

describe('shouldSendPreliminaryCheckIn', () => {

  test('returns false when observation window has already closed', async () => {
    const habit = makeHabit({ observationWindowEnd: daysAgo(1) });
    mockDb.habit.findUnique.mockResolvedValue(habit);
    mockDb.habitCheckIn.findMany.mockResolvedValue([]);

    const result = await shouldSendPreliminaryCheckIn('habit-1');
    expect(result).toBe(false);
  });

  test('returns false when nudge was already sent', async () => {
    const habit = makeHabit({
      observationWindowEnd: daysFromNow(10),
      gentleNudgeSentAt:    daysAgo(5),
      createdAt:            daysAgo(20),
    });
    mockDb.habit.findUnique.mockResolvedValue(habit);
    mockDb.habitCheckIn.findMany.mockResolvedValue([]);

    const result = await shouldSendPreliminaryCheckIn('habit-1');
    expect(result).toBe(false);
  });

  test('returns false when halfway point has not been reached yet', async () => {
    // preliminary check fires at day 15 — using daysAgo(13) gives a safe margin
    // so Math.round never accidentally produces 15 regardless of time of day
    const habit = makeHabit({
      observationWindowEnd: daysFromNow(17),
      createdAt:            daysAgo(13),
    });
    mockDb.habit.findUnique.mockResolvedValue(habit);
    mockDb.habitCheckIn.findMany.mockResolvedValue([]);

    const result = await shouldSendPreliminaryCheckIn('habit-1');
    expect(result).toBe(false);
  });

  test('returns false when consistency is well above 40% threshold', async () => {
    // 20-day-old habit: expected ~20-21 completions internally
    // 16 completed = 76-80% — safely above the 40% threshold regardless of time of day
    const habit = makeHabit({
      observationWindowEnd: daysFromNow(10),
      createdAt:            daysAgo(20),
    });
    mockDb.habit.findUnique.mockResolvedValue(habit);
    mockDb.habitCheckIn.findMany.mockResolvedValue(mixedCheckIns(16, 4));

    const result = await shouldSendPreliminaryCheckIn('habit-1');
    expect(result).toBe(false);
  });

  test('returns true when past halfway and consistency is well below 40%', async () => {
    // 20-day-old habit: expected ~20-21 completions internally
    // 5 completed = 23-25% — safely below the 40% threshold regardless of time of day
    const habit = makeHabit({
      observationWindowEnd: daysFromNow(10),
      createdAt:            daysAgo(20),
    });
    mockDb.habit.findUnique.mockResolvedValue(habit);
    mockDb.habitCheckIn.findMany.mockResolvedValue(mixedCheckIns(5, 15));

    const result = await shouldSendPreliminaryCheckIn('habit-1');
    expect(result).toBe(true);
  });

  test('returns true when habit has zero completions past the halfway point', async () => {
    const habit = makeHabit({
      observationWindowEnd: daysFromNow(10),
      createdAt:            daysAgo(20),
    });
    mockDb.habit.findUnique.mockResolvedValue(habit);
    mockDb.habitCheckIn.findMany.mockResolvedValue([]);

    const result = await shouldSendPreliminaryCheckIn('habit-1');
    expect(result).toBe(true);
  });

  test('WEEKLY: returns false before the day-28 halfway point', async () => {
    // using daysAgo(20) gives safe margin below the day-28 threshold
    const habit = makeHabit({
      frequency:            'WEEKLY',
      observationWindowEnd: daysFromNow(35),
      createdAt:            daysAgo(20),
    });
    mockDb.habit.findUnique.mockResolvedValue(habit);
    mockDb.habitCheckIn.findMany.mockResolvedValue([]);

    const result = await shouldSendPreliminaryCheckIn('habit-1');
    expect(result).toBe(false);
  });

  test('WEEKLY: returns true past day-28 with low consistency', async () => {
    const habit = makeHabit({
      frequency:            'WEEKLY',
      observationWindowEnd: daysFromNow(10),
      createdAt:            daysAgo(30),  // safely past day-28 halfway point
    });
    mockDb.habit.findUnique.mockResolvedValue(habit);
    // 30-day range → ~4 expected weekly completions; 1 completed = ~25%
    mockDb.habitCheckIn.findMany.mockResolvedValue(mixedCheckIns(1, 3));

    const result = await shouldSendPreliminaryCheckIn('habit-1');
    expect(result).toBe(true);
  });

  test('throws 404 when habit does not exist', async () => {
    mockDb.habit.findUnique.mockResolvedValue(null);

    await expect(
      shouldSendPreliminaryCheckIn('nonexistent')
    ).rejects.toMatchObject({ status: 404 });
  });
});