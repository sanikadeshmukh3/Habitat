// tests/integration/checkin.test.js
//
// Integration tests for the Check In use case — one of the two primary use
// cases defined in the Habitat SRS.
//
// This test covers the full end-to-end path a check-in takes through the system:
//   Auth middleware → POST /checkins → checkinController → checkinService →
//   Prisma (streak recalculation, points award, badge evaluation) → database
//   → GET /checkins (month view) → check-in appears in calendar map
//
// What these tests verify:
//   - A logged-in user can check in on an active habit
//   - The response includes the updated streak and points earned
//   - The completed check-in appears in the monthly calendar query
//   - A check-in can be unchecked (completed=false) and the streak reverts
//   - Optional fields (difficultyRating, notes) are persisted correctly
//   - Invalid input is rejected before any DB write
//   - Unauthenticated requests are blocked by auth middleware
//
// Connects to a real PostgreSQL database — requires DATABASE_URL in .env.
//
// Run with: npm run test:integration

const request  = require('supertest');
const bcrypt   = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const app      = require('../../server');

const prisma = new PrismaClient();

jest.setTimeout(20000);

// ─── Shared state ─────────────────────────────────────────────────────────────

const EMAIL    = `checkin_test_${Date.now()}@habitat.test`;
const PASSWORD = 'password123';
let token;
let userId;
let habitId;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as a local ISO string (YYYY-MM-DDT00:00:00.000Z). */
function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Returns a date n days ago as a local ISO string. */
function daysAgoISO(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** Removes all test data for the test user. */
async function cleanupTestUser() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) return;

  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const ids = habits.map((h) => h.id);

  if (ids.length > 0) {
    await prisma.stackingScheduleEntry.deleteMany({ where: { habitId: { in: ids } } });
    await prisma.habitCheckIn.deleteMany({ where: { habitId: { in: ids } } });
    await prisma.habit.deleteMany({ where: { userId: user.id } });
  }

  await prisma.userBadge.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { email: EMAIL } });
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanupTestUser();

  // Create test user
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email:      EMAIL,
      password:   hashed,
      firstName:  'Test',
      lastName:   'User',
      username:   `checkin_${Date.now()}`,
      isVerified: true,
    },
  });
  userId = user.id;

  // Log in and store JWT
  const loginRes = await request(app)
    .post('/login')
    .send({ email: EMAIL, password: PASSWORD });

  expect(loginRes.statusCode).toBe(200);
  token = loginRes.body.token;

  // Create the test habit used throughout this suite
  const habitRes = await request(app)
    .post('/habits')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name:          'Morning Run',
      habitCategory: 'FITNESS',
      frequency:     'DAILY',
      visibility:    true,
    });

  expect([200, 201]).toContain(habitRes.statusCode);
  habitId = habitRes.body.data.id;
});

beforeEach(async () => {
  // Remove any check-ins created by the previous test so each test starts clean
  await prisma.habitCheckIn.deleteMany({ where: { habitId } });
  // Reset streak to 0 so streak assertions are deterministic
  await prisma.habit.update({
    where: { id: habitId },
    data:  { currentStreak: 0, streakProbationPeriodStart: null },
  });
});

afterAll(async () => {
  await cleanupTestUser();
  await prisma.$disconnect();
});

// ─── POST /checkins — happy path ──────────────────────────────────────────────

describe('Check In use case — POST /checkins', () => {

  /**
   * Core happy path: a user marks a habit as completed for today.
   * The response must include the new streak (1) and points earned (1).
   * This is the fundamental action the entire gamification system is built on.
   */
  it('should record a completed check-in and return the updated streak and points', async () => {
    const res = await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({
        habitId,
        date:      todayISO(),
        completed: true,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.newStreak).toBe(1);
    expect(res.body.data.pointsEarned).toBe(1);  // first check-in: 1 + floor(log2(1)) = 1
    expect(res.body.data.streakBroke).toBe(false);
  });

  /**
   * Consecutive day: a prior check-in exists from yesterday. Checking in today
   * must increment the streak to 2 and award 2 points (1 + floor(log2(2)) = 2).
   */
  it('should increment the streak on a consecutive day and award correct points', async () => {
    // Seed yesterday's check-in directly so we have a streak to build on
    await prisma.habitCheckIn.create({
      data: { habitId, userId, date: new Date(daysAgoISO(1)), completed: true },
    });
    await prisma.habit.update({
      where: { id: habitId },
      data:  { currentStreak: 1 },
    });

    const res = await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({
        habitId,
        date:      todayISO(),
        completed: true,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.newStreak).toBe(2);
    expect(res.body.data.pointsEarned).toBe(2); // 1 + floor(log2(2)) = 2
    expect(res.body.data.streakBroke).toBe(false);
  });

  /**
   * Optional fields: difficultyRating (1–3) and notes are persisted on the
   * check-in row and must be retrievable from the database after the request.
   */
  it('should persist difficultyRating and notes when provided', async () => {
    const res = await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({
        habitId,
        date:             todayISO(),
        completed:        true,
        difficultyRating: 2,
        notes:            'Felt great today',
      });

    expect(res.statusCode).toBe(200);

    // Verify the values were written to the DB
    const checkIn = await prisma.habitCheckIn.findFirst({
      where: { habitId, completed: true },
    });
    expect(checkIn).not.toBeNull();
    expect(checkIn.difficultyRating).toBe(2);
    expect(checkIn.notes).toBe('Felt great today');
  });

  /**
   * Unchecking: sending completed=false on a day that was previously marked
   * complete must deduct the stored points and recalculate the streak.
   * pointsEarned in the response is negative (the amount deducted).
   */
  it('should uncheck a check-in, deduct points, and reset streak', async () => {
    // First, check in
    await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId, date: todayISO(), completed: true });

    // Then uncheck
    const res = await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId, date: todayISO(), completed: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.newStreak).toBe(0);
    expect(res.body.data.pointsEarned).toBeLessThanOrEqual(0); // points deducted
  });

  /**
   * Check-in appears in the monthly calendar query: after a successful check-in,
   * GET /checkins with the current year and month must include the habit's
   * entry for today marked as completed. This verifies the full round-trip
   * across the check-in → calendar display pipeline.
   */
  it('should appear as completed in the monthly calendar view after check-in', async () => {
    const today = new Date();

    await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId, date: todayISO(), completed: true });

    const calRes = await request(app)
      .get(`/checkins?year=${today.getFullYear()}&month=${today.getMonth() + 1}`)
      .set('Authorization', `Bearer ${token}`);

    expect(calRes.statusCode).toBe(200);

    // The calendar returns a map keyed by "{habitId}-YYYY-MM-DD"
    // Find any entry for our habit that is marked completed
    const entries = Object.values(calRes.body.data || calRes.body);
    const todayEntry = entries.find(
      (e) => e.habitId === habitId && e.completed === true
    );
    expect(todayEntry).toBeTruthy();
  });

  // ── Input validation ────────────────────────────────────────────────────────

  /**
   * Missing habitId: the service validates this before opening a DB transaction.
   * Must reject with 400.
   */
  it('should return 400 when habitId is missing', async () => {
    const res = await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: todayISO(), completed: true });

    expect(res.statusCode).toBe(400);
  });

  /**
   * Missing date: required to determine which calendar day the check-in
   * belongs to and to compute streak differences. Must reject with 400.
   */
  it('should return 400 when date is missing', async () => {
    const res = await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId, completed: true });

    expect(res.statusCode).toBe(400);
  });

  /**
   * difficultyRating out of range: only 1, 2, or 3 are valid.
   * A value of 5 must be rejected with 400 before any DB write.
   */
  it('should return 400 when difficultyRating is out of range', async () => {
    const res = await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId, date: todayISO(), completed: true, difficultyRating: 5 });

    expect(res.statusCode).toBe(400);
  });

  /**
   * notes exceeding 500 characters: must be rejected with 400.
   */
  it('should return 400 when notes exceed 500 characters', async () => {
    const res = await request(app)
      .post('/checkins')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId, date: todayISO(), completed: true, notes: 'x'.repeat(501) });

    expect(res.statusCode).toBe(400);
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  /**
   * Unauthenticated request: the auth middleware must reject before the
   * controller is reached.
   */
  it('should return 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/checkins')
      .send({ habitId, date: todayISO(), completed: true });

    expect([401, 403]).toContain(res.statusCode);
  });
});