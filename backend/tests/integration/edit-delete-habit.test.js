// tests/integration/edit-delete-habit.test.js
//
// Integration tests for the Edit Habit and Delete Habit use cases.
// Fires real HTTP requests against the Express app via Supertest.
// Connects to a real PostgreSQL database — requires DATABASE_URL in .env.
//
// Use cases covered:
//   - Edit Habit   (PATCH /habits/:id)
//   - Delete Habit (DELETE /habits/:id)
//
// What these tests verify end-to-end:
//   Auth → route → habit-controller → Prisma → database → response
//
// Setup: a real test user and habits are created in beforeAll and torn down
// in afterAll. Each test that needs a fresh habit creates one inline.
//
// Run with: npm run test:integration

const request  = require('supertest');
const bcrypt   = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const app      = require('../../server');

const prisma = new PrismaClient();

// ─── Shared state ─────────────────────────────────────────────────────────────

const EMAIL    = `edit_delete_test_${Date.now()}@habitat.test`;
const PASSWORD = 'password123';
let token;
let userId;
let habitId; // primary test habit shared across edit tests

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a habit directly in the DB and returns its id. */
async function createHabitInDb(name, overrides = {}) {
  const habit = await prisma.habit.create({
    data: {
      userId,
      name,
      habitCategory: 'WELLNESS',
      frequency:     'DAILY',
      visibility:    true,
      active:        true,
      updatedAt:     new Date(),
      observationWindowEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ...overrides,
    },
  });
  return habit.id;
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

  await prisma.user.delete({ where: { email: EMAIL } });
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanupTestUser();

  const hashed = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email:      EMAIL,
      password:   hashed,
      firstName:  'Test',
      lastName:   'User',
      username:   `edit_delete_${Date.now()}`,
      isVerified: true,
    },
  });
  userId = user.id;

  const loginRes = await request(app)
    .post('/login')
    .send({ email: EMAIL, password: PASSWORD });

  expect(loginRes.statusCode).toBe(200);
  token = loginRes.body.token;

  // Primary habit used by most edit tests
  habitId = await createHabitInDb('Morning Run');
});

afterAll(async () => {
  await cleanupTestUser();
  await prisma.$disconnect();
});

// ─── Edit Habit — PATCH /habits/:id ──────────────────────────────────────────

describe('Edit Habit (PATCH /habits/:id)', () => {

  // ── Happy path ─────────────────────────────────────────────────────────────

  /**
   * Core happy path: renaming a habit. The updated name must be
   * returned in the response and persisted in the database.
   */
  it('should update the habit name and return the updated habit', async () => {
    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Evening Run' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('Evening Run');

    // Verify it was actually written to the DB
    const fromDb = await prisma.habit.findUnique({ where: { id: habitId } });
    expect(fromDb.name).toBe('Evening Run');

    // Restore for subsequent tests
    await prisma.habit.update({ where: { id: habitId }, data: { name: 'Morning Run' } });
  });

  /**
   * Category update: a valid habitCategory change must persist and be
   * reflected in the response body.
   */
  it('should update habitCategory', async () => {
    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ habitCategory: 'FITNESS' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.habitCategory).toBe('FITNESS');

    await prisma.habit.update({ where: { id: habitId }, data: { habitCategory: 'WELLNESS' } });
  });

  /**
   * Clearing description: sending an empty string must store null, not ''.
   * The controller converts '' → null so the DB column stays clean.
   */
  it('should clear the description when an empty string is sent', async () => {
    await prisma.habit.update({ where: { id: habitId }, data: { description: 'Some description' } });

    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: '' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.description).toBeNull();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  // NOTE: An empty body (no fields) currently returns 200 rather than 400 because
  // the controller assigns `data.updatedAt = new Date()` before the
  // `Object.keys(data).length === 0` guard runs, so the guard never fires.
  // This is tracked as a known issue in the GitHub issue tracker.

  /**
   * Whitespace-only name: must be rejected with 400. Every habit requires a
   * non-empty display name.
   */
  it('should return 400 when name is whitespace-only', async () => {
    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  /**
   * Duplicate name guard: renaming to the same name as another active habit
   * must be rejected with 409. This was a real bug identified during
   * development and explicitly fixed in the edit controller.
   */
  it('should return 409 when the new name duplicates another active habit', async () => {
    const secondId = await createHabitInDb('Yoga Session');

    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Yoga Session' });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already have a habit/i);

    await prisma.habit.delete({ where: { id: secondId } });
  });

  /**
   * Duplicate name check is case-insensitive: "meditation" must collide with
   * "Meditation" already on record.
   */
  it('should return 409 for a case-insensitive duplicate name', async () => {
    const secondId = await createHabitInDb('Meditation');

    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'meditation' });

    expect(res.statusCode).toBe(409);

    await prisma.habit.delete({ where: { id: secondId } });
  });

  /**
   * Invalid habitCategory: must be rejected with 400.
   * Valid values: FITNESS, NUTRITION, SLEEP, PRODUCTIVITY, WELLNESS, OTHER.
   */
  it('should return 400 for an invalid habitCategory', async () => {
    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ habitCategory: 'GAMING' });

    expect(res.statusCode).toBe(400);
  });

  /**
   * Invalid frequency: must be rejected with 400. Only DAILY and WEEKLY are
   * valid. Note: the frontend also disables the frequency toggle during editing
   * to prevent streak data inconsistencies — this test verifies the backend
   * guard exists independently of the UI constraint.
   */
  it('should return 400 for an invalid frequency', async () => {
    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ frequency: 'MONTHLY' });

    expect(res.statusCode).toBe(400);
  });

  // ── Auth / ownership ───────────────────────────────────────────────────────

  /**
   * Unauthenticated request: must be rejected by the auth middleware.
   */
  it('should return 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/habits/${habitId}`)
      .send({ name: 'Hacked' });

    expect([401, 403]).toContain(res.statusCode);
  });

  /**
   * Non-existent habit: must return 404.
   */
  it('should return 404 when the habit does not exist', async () => {
    const res = await request(app)
      .patch('/habits/nonexistent-id-000')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ghost' });

    expect(res.statusCode).toBe(404);
  });
});

// ─── Delete Habit — DELETE /habits/:id ───────────────────────────────────────

describe('Delete Habit (DELETE /habits/:id)', () => {

  /**
   * Core soft-delete happy path: the habit disappears from the default active
   * list immediately but the row is preserved in the DB. This is the
   * fundamental guarantee of soft deletion — history is never destroyed.
   */
  it('should soft-delete the habit: gone from active list, row preserved in DB', async () => {
    const idToDelete = await createHabitInDb('Habit To Delete');

    const deleteRes = await request(app)
      .delete(`/habits/${idToDelete}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.data.id).toBe(idToDelete);

    // Must NOT appear in the default active habits list
    const listRes = await request(app)
      .get('/habits')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.statusCode).toBe(200);
    const activeIds = listRes.body.data.map((h) => h.id);
    expect(activeIds).not.toContain(idToDelete);

    // Row still exists and active=false, deletedAt is set
    const fromDb = await prisma.habit.findUnique({ where: { id: idToDelete } });
    expect(fromDb).not.toBeNull();
    expect(fromDb.active).toBe(false);
    expect(fromDb.deletedAt).not.toBeNull();
  });

  /**
   * Check-in preservation: historical check-ins must survive soft delete.
   * This is the core invariant — the calendar view relies on these records
   * to show deleted habits in a distinct visual state.
   */
  it('should preserve check-in history after soft delete', async () => {
    const idToDelete = await createHabitInDb('Habit With History');

    await prisma.habitCheckIn.create({
      data: {
        habitId:   idToDelete,
        date:      new Date(Date.now() - 24 * 60 * 60 * 1000),
        completed: true,
      },
    });

    await request(app)
      .delete(`/habits/${idToDelete}`)
      .set('Authorization', `Bearer ${token}`);

    // Check-ins must still be in the DB after soft delete
    const checkIns = await prisma.habitCheckIn.findMany({
      where: { habitId: idToDelete },
    });
    expect(checkIns.length).toBeGreaterThan(0);
  });

  /**
   * includeInactive flag: deleted habits must surface when the caller
   * explicitly requests inactive habits (e.g., for the calendar view that
   * shows deleted habits in a distinct visual state).
   */
  it('should appear when GET /habits?includeInactive=true is called', async () => {
    const idToDelete = await createHabitInDb('Archived Habit');

    await request(app)
      .delete(`/habits/${idToDelete}`)
      .set('Authorization', `Bearer ${token}`);

    const listRes = await request(app)
      .get('/habits?includeInactive=true')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.statusCode).toBe(200);
    const found = listRes.body.data.find((h) => h.id === idToDelete);
    expect(found).toBeTruthy();
    expect(found.active).toBe(false);
  });

  // ── Auth / ownership ───────────────────────────────────────────────────────

  /**
   * Unauthenticated delete: auth middleware must reject before the controller.
   */
  it('should return 401 when no token is provided', async () => {
    const res = await request(app).delete(`/habits/${habitId}`);
    expect([401, 403]).toContain(res.statusCode);
  });

  /**
   * Non-existent habit: must return 404 before any update is attempted.
   */
  it('should return 404 when the habit does not exist', async () => {
    const res = await request(app)
      .delete('/habits/nonexistent-id-000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });
});