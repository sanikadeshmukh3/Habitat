// __tests__/checkinService.test.js

jest.mock('../../lib/prisma', () => ({
  habit: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    update:     jest.fn(),
  },
  habitCheckIn: {
    findFirst: jest.fn(),
    create:    jest.fn(),
    update:    jest.fn(),
    findMany:  jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  userBadge: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../../lib/prisma');
const { upsertHabitCheckIn } = require('../../services/checkinService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function makeHabit(overrides = {}) {
  return {
    id:                         'habit-1',
    userId:                     'user-1',
    frequency:                  'DAILY',
    active:                     true,
    currentStreak:              0,
    streakProbationPeriodStart: null,
    createdAt:                  daysAgo(1),
    consistencyScore:           null,
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    points:   1,
    creation: daysAgo(1),
    badges:   [],
    ...overrides,
  };
}

// ─── Mock setup ───────────────────────────────────────────────────────────────

let mockTx;

beforeEach(() => {
  jest.clearAllMocks();

  mockTx = {
    habit: {
      findUniqueOrThrow: jest.fn(),
      findUnique:        jest.fn(),
      findMany:          jest.fn().mockResolvedValue([]),
      update:            jest.fn().mockResolvedValue({}),
    },
    habitCheckIn: {
      findFirst: jest.fn().mockResolvedValue(null),
      create:    jest.fn().mockResolvedValue({ id: 'checkin-1', pointsEarned: 0 }),
      update:    jest.fn().mockResolvedValue({ id: 'checkin-1', pointsEarned: 0 }),
      findMany:  jest.fn().mockResolvedValue([]),
    },
    user: {
      update: jest.fn().mockResolvedValue(makeUser()),
    },
    userBadge: {
      createMany: jest.fn().mockResolvedValue({}),
    },
  };

  prisma.habit.findUnique.mockResolvedValue(makeHabit());
  prisma.$transaction.mockImplementation((fn) => fn(mockTx));
});

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * These tests verify that upsertHabitCheckIn rejects bad input early, before
 * any DB transaction is opened. Each guard produces a structured error with
 * the appropriate HTTP status so the route layer can return the right response.
 */
describe('upsertHabitCheckIn — validation', () => {
  /**
   * habitId is required to identify which habit to update. A null value must
   * throw a 400 before any database call is made.
   */
  test('throws 400 if habitId is missing', async () => {
    await expect(
      upsertHabitCheckIn('user-1', null, { date: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 400 });
  });

  /**
   * date is required to determine which calendar day the check-in belongs to
   * and to compute day differences for streak logic. Missing it throws 400.
   */
  test('throws 400 if date is missing', async () => {
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', {}),
    ).rejects.toMatchObject({ status: 400 });
  });

  /**
   * difficultyRating must be 1, 2, or 3 if provided. A value of 5 is out of
   * range and must throw 400. This is validated before the DB is consulted.
   */
  test('throws 400 if difficultyRating is out of range', async () => {
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString(), difficultyRating: 5 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  /**
   * notes is capped at 500 characters to prevent runaway storage usage.
   * A 501-character string must throw 400.
   */
  test('throws 400 if notes exceed 500 chars', async () => {
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString(), notes: 'x'.repeat(501) }),
    ).rejects.toMatchObject({ status: 400 });
  });

  /**
   * If no habit row matches the given habitId, the function must throw 404
   * rather than attempting to update a non-existent record.
   */
  test('throws 404 if habit not found', async () => {
    prisma.habit.findUnique.mockResolvedValue(null);
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 404 });
  });

  /**
   * A user may only modify their own habits. If the habit's userId differs
   * from the authenticated userId, the function must throw 403 Forbidden.
   */
  test('throws 403 if habit belongs to a different user', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ userId: 'someone-else' }));
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 403 });
  });

  /**
   * Inactive habits cannot be checked in to prevent history manipulation on
   * paused or deleted habits. The function must throw 400 if active is false.
   */
  test('throws 400 if habit is inactive', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ active: false }));
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ─── Complete path: streak + points ──────────────────────────────────────────

/**
 * These tests cover the "complete" path (completed=true). They verify the full
 * chain: streak computation → points award → streak written back to the habit →
 * points written to the user.
 */
describe('upsertHabitCheckIn — completing a check-in', () => {
  /**
   * When no prior completed check-ins exist, this is the first ever check-in
   * for the habit. The streak must start at 1 and the user earns 1 point.
   */
  test('first check-in starts streak at 1 and awards 1 point', async () => {
    mockTx.habitCheckIn.findMany.mockResolvedValue([]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newStreak).toBe(1);
    expect(result.pointsEarned).toBe(1);
    expect(mockTx.habit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentStreak: 1 }) }),
    );
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: 1 } } }),
    );
  });

  /**
   * Checking in the day after the last completed check-in increments the
   * streak. With currentStreak=4 → newStreak=5.
   * Points: 1 + floor(log2(5)) = 3.
   */
  test('consecutive day increments streak and awards correct points', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 4 }));
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(1) }]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newStreak).toBe(5);
    expect(result.pointsEarned).toBe(3); // 1 + floor(log2(5)) = 3
    expect(result.streakBroke).toBe(false);
  });

  /**
   * Streak 7→8 is a power-of-two boundary: 1 + floor(log2(8)) = 4 points.
   * Verifies the points formula at this milestone without a badge test
   * muddying the assertion.
   */
  test('streak of 8 earns 4 points', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 7 }));
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(1) }]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newStreak).toBe(8);
    expect(result.pointsEarned).toBe(4); // 1 + floor(log2(8)) = 4
  });

  /**
   * pointsEarned must be persisted on the habitCheckIn row immediately after
   * the streak is resolved. This allows the uncheck path to deduct exactly the
   * correct amount without recalculating what the streak was at the time.
   */
  test('pointsEarned is stored on the check-in row', async () => {
    mockTx.habitCheckIn.findMany.mockResolvedValue([]);
    mockTx.habitCheckIn.create.mockResolvedValue({ id: 'checkin-1', pointsEarned: 0 });

    await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    // Second update call writes pointsEarned back to the check-in row
    expect(mockTx.habitCheckIn.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pointsEarned: 1 }) }),
    );
  });

  /**
   * daysDiff === 2 with no probation active is an unrecovered missed day.
   * The streak must break and reset to 1 regardless of how high it was.
   */
  test('missing a day with no probation breaks streak and resets to 1', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 10 }));
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(2) }]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(true);
  });

  /**
   * Probation was previously activated (streakProbationPeriodStart is set)
   * and the user checks in within the recovery window. The streak continues
   * from its pre-miss value and probation clears.
   */
  test('recovering within probation continues streak', async () => {
    prisma.habit.findUnique.mockResolvedValue(
      makeHabit({ currentStreak: 10, streakProbationPeriodStart: daysAgo(1) }),
    );
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(2) }]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newStreak).toBe(11);
    expect(result.streakBroke).toBe(false);
  });

  /**
   * The prior check-in query must be filtered to dates on or after the habit's
   * creation date (gte: habit.createdAt). This ensures that any check-ins
   * inserted before the habit existed cannot inflate the streak. We verify
   * the constraint is present in the query arguments passed to findMany.
   */
  test('prior check-in query is bounded by habit creation date (complete path)', async () => {
    const habitCreatedAt = daysAgo(5);
    prisma.habit.findUnique.mockResolvedValue(
      makeHabit({ currentStreak: 3, createdAt: habitCreatedAt }),
    );
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(1) }]);

    await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(mockTx.habitCheckIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({ gte: habitCreatedAt }),
        }),
      }),
    );
  });
});

// ─── Uncheck path: points deducted, streak recalculated ───────────────────────

/**
 * These tests cover the "uncheck" path (completed=false). When a user removes
 * a check-in the service must deduct the exact points that were originally
 * awarded, recalculate the streak from the remaining history, and clear any
 * probation state.
 */
describe('upsertHabitCheckIn — unchecking a check-in', () => {
  /**
   * The stored pointsEarned value (3 in this case) must be decremented from
   * the user's total. The return value pointsEarned must be the negative of
   * what was deducted so the client can animate the change.
   */
  test('deducts the stored pointsEarned from the user', async () => {
    // Existing check-in had earned 3 points
    mockTx.habitCheckIn.findFirst.mockResolvedValue({ id: 'checkin-1', pointsEarned: 3 });
    // No remaining completed check-ins after uncheck
    mockTx.habitCheckIn.findMany.mockResolvedValue([]);
    mockTx.user.update.mockResolvedValue({ points: 7 }); // 10 - 3

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: false,
    });

    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { decrement: 3 } } }),
    );
    expect(result.pointsEarned).toBe(-3);
  });

  /**
   * If the check-in row has pointsEarned === 0 (e.g. legacy data from before
   * the points system), the decrement must be 0 and pointsEarned returns 0
   * (not -0). Nothing is subtracted from the user's balance.
   */
  test('deducts 0 points if check-in never had pointsEarned (e.g. old data)', async () => {
    mockTx.habitCheckIn.findFirst.mockResolvedValue({ id: 'checkin-1', pointsEarned: 0 });
    mockTx.habitCheckIn.findMany.mockResolvedValue([]);
    mockTx.user.update.mockResolvedValue({ points: 5 });

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: false,
    });

    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { decrement: 0 } } }),
    );
    expect(result.pointsEarned).toBe(0);
  });

  /**
   * After unchecking today's check-in, three consecutive completed days remain
   * (yesterday, 2 days ago, 3 days ago). The recalculated streak must be 3,
   * not the pre-uncheck value of 5, and must be written back to the habit row.
   */
  test('recalculates streak from remaining completed check-ins', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 5 }));
    mockTx.habitCheckIn.findFirst.mockResolvedValue({ id: 'checkin-1', pointsEarned: 3 });
    // After uncheck, 3 consecutive completed days remain (yesterday, 2 days ago, 3 days ago)
    mockTx.habitCheckIn.findMany.mockResolvedValue([
      { date: daysAgo(1) },
      { date: daysAgo(2) },
      { date: daysAgo(3) },
    ]);
    mockTx.user.update.mockResolvedValue({ points: 5 });

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: false,
    });

    // today unchecked, yesterday through 3 days ago are consecutive → streak = 3
    expect(result.newStreak).toBe(3);
    expect(mockTx.habit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentStreak: 3 }) }),
    );
  });

  /**
   * If no completed check-ins remain at all after the uncheck, the streak
   * must be 0. An empty remaining set is a valid state.
   */
  test('streak becomes 0 when no remaining completed check-ins', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 1 }));
    mockTx.habitCheckIn.findFirst.mockResolvedValue({ id: 'checkin-1', pointsEarned: 1 });
    mockTx.habitCheckIn.findMany.mockResolvedValue([]);
    mockTx.user.update.mockResolvedValue({ points: 0 });

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: false,
    });

    expect(result.newStreak).toBe(0);
  });

  /**
   * A full recalculation is the authoritative source of truth after an uncheck.
   * Any active probation period must be cleared because the recalculated streak
   * does not use the incremental probation logic.
   */
  test('clears probation period on uncheck', async () => {
    prisma.habit.findUnique.mockResolvedValue(
      makeHabit({ currentStreak: 5, streakProbationPeriodStart: daysAgo(1) }),
    );
    mockTx.habitCheckIn.findFirst.mockResolvedValue({ id: 'checkin-1', pointsEarned: 2 });
    mockTx.habitCheckIn.findMany.mockResolvedValue([]);
    mockTx.user.update.mockResolvedValue({ points: 3 });

    await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: false,
    });

    expect(mockTx.habit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ streakProbationPeriodStart: null }),
      }),
    );
  });

  /**
   * Badges are never revoked when a check-in is removed (removing a badge is
   * confusing UX and hard to reason about). newBadges must always be an empty
   * array on the uncheck path.
   */
  test('returns newBadges as empty array (badges are never removed on uncheck)', async () => {
    mockTx.habitCheckIn.findFirst.mockResolvedValue({ id: 'checkin-1', pointsEarned: 1 });
    mockTx.habitCheckIn.findMany.mockResolvedValue([]);
    mockTx.user.update.mockResolvedValue({ points: 0 });

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: false,
    });

    expect(result.newBadges).toEqual([]);
  });

  /**
   * The remaining check-in query must be filtered to dates on or after the
   * habit's creation date (gte: habit.createdAt). This ensures that any
   * backdated check-ins that predate the habit cannot prop up the recalculated
   * streak. We verify the constraint is present in the query arguments.
   */
  test('remaining check-in query is bounded by habit creation date (uncheck path)', async () => {
    const habitCreatedAt = daysAgo(10);
    prisma.habit.findUnique.mockResolvedValue(
      makeHabit({ currentStreak: 5, createdAt: habitCreatedAt }),
    );
    mockTx.habitCheckIn.findFirst.mockResolvedValue({ id: 'checkin-1', pointsEarned: 2 });
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(1) }]);
    mockTx.user.update.mockResolvedValue({ points: 5 });

    await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: false,
    });

    expect(mockTx.habitCheckIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({ gte: habitCreatedAt }),
        }),
      }),
    );
  });
});

// ─── Badges ───────────────────────────────────────────────────────────────────

/**
 * These tests verify badge evaluation: that qualifying thresholds trigger
 * badge insertion, that already-earned badges are not re-awarded, and that
 * no badge calls are made when nothing qualifies.
 */
describe('upsertHabitCheckIn — badge awarding', () => {
  /**
   * The streak_starter badge is awarded when any habit's streak reaches 7.
   * Here currentStreak goes from 6 → 7, which crosses that threshold.
   * The badge ID must appear in newBadges and createMany must be called.
   */
  test('awards streak_starter when streak reaches 7', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 6 }));
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(1) }]);
    mockTx.user.update.mockResolvedValue(makeUser({ points: 10 }));
    mockTx.habit.findMany.mockResolvedValue([
      { id: 'habit-1', frequency: 'DAILY', currentStreak: 7, consistencyScore: null, createdAt: daysAgo(10) },
    ]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newBadges.map((b) => b.id)).toContain('streak_starter');
    expect(mockTx.userBadge.createMany).toHaveBeenCalled();
  });

  /**
   * If the user already holds the streak_starter badge (returned in the
   * badges array from the user update), it must not be awarded a second time.
   * createMany may still be called for other badges, but streak_starter must
   * not be in the result's newBadges array.
   */
  test('does not re-award a badge the user already has', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 6 }));
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(1) }]);
    mockTx.user.update.mockResolvedValue(makeUser({ badges: [{ badgeId: 'streak_starter' }] }));
    mockTx.habit.findMany.mockResolvedValue([
      { id: 'habit-1', frequency: 'DAILY', currentStreak: 7, consistencyScore: null, createdAt: daysAgo(10) },
    ]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newBadges.map((b) => b.id)).not.toContain('streak_starter');
  });

  /**
   * When the check-in does not cross any badge threshold (e.g. streak=1,
   * no special conditions), newBadges must be an empty array and createMany
   * must not be called at all.
   */
  test('awards no badges when nothing qualifies', async () => {
    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newBadges).toEqual([]);
    expect(mockTx.userBadge.createMany).not.toHaveBeenCalled();
  });
});