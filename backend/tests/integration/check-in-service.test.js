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

describe('upsertHabitCheckIn — validation', () => {
  test('throws 400 if habitId is missing', async () => {
    await expect(
      upsertHabitCheckIn('user-1', null, { date: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('throws 400 if date is missing', async () => {
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', {}),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('throws 400 if difficultyRating is out of range', async () => {
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString(), difficultyRating: 5 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('throws 400 if notes exceed 500 chars', async () => {
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString(), notes: 'x'.repeat(501) }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('throws 404 if habit not found', async () => {
    prisma.habit.findUnique.mockResolvedValue(null);
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 404 });
  });

  test('throws 403 if habit belongs to a different user', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ userId: 'someone-else' }));
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 403 });
  });

  test('throws 400 if habit is inactive', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ active: false }));
    await expect(
      upsertHabitCheckIn('user-1', 'habit-1', { date: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ─── Complete path: streak + points ──────────────────────────────────────────

describe('upsertHabitCheckIn — completing a check-in', () => {
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

  test('streak of 8 earns 4 points', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 7 }));
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(1) }]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newStreak).toBe(8);
    expect(result.pointsEarned).toBe(4); // 1 + floor(log2(8)) = 4
  });

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

  test('missing a day with no probation breaks streak and resets to 1', async () => {
    prisma.habit.findUnique.mockResolvedValue(makeHabit({ currentStreak: 10 }));
    mockTx.habitCheckIn.findMany.mockResolvedValue([{ date: daysAgo(2) }]);

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newStreak).toBe(1);
    expect(result.streakBroke).toBe(true);
  });

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
});

// ─── Uncheck path: points deducted, streak recalculated ───────────────────────

describe('upsertHabitCheckIn — unchecking a check-in', () => {
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

  test('returns newBadges as empty array (badges are never removed on uncheck)', async () => {
    mockTx.habitCheckIn.findFirst.mockResolvedValue({ id: 'checkin-1', pointsEarned: 1 });
    mockTx.habitCheckIn.findMany.mockResolvedValue([]);
    mockTx.user.update.mockResolvedValue({ points: 0 });

    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: false,
    });

    expect(result.newBadges).toEqual([]);
  });
});

// ─── Badges ───────────────────────────────────────────────────────────────────

describe('upsertHabitCheckIn — badge awarding', () => {
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

  test('awards no badges when nothing qualifies', async () => {
    const result = await upsertHabitCheckIn('user-1', 'habit-1', {
      date: new Date().toISOString(), completed: true,
    });

    expect(result.newBadges).toEqual([]);
    expect(mockTx.userBadge.createMany).not.toHaveBeenCalled();
  });
});