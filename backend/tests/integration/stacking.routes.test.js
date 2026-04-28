// tests/integration/stacking.routes.test.js
//
// Integration tests for all stacking API endpoints.
// Uses Supertest to fire real HTTP requests against the Express app.
// Prisma and all service modules are mocked — no database required.
//
// What these tests cover:
//   - Auth middleware: every route rejects requests with no token (401)
//     and with an invalid/expired token (403)
//   - Input validation: routes return 400 when required fields are missing
//     or malformed, before any service code is reached
//   - Route-level business logic guards: 409 (duplicate enrollment),
//     404 (missing resources), 403 (ownership mismatch), 400 (wrong state)
//   - Happy path response shapes: correct status codes and response fields
//     when services return successfully
//
// Mock architecture:
//   process.env.JWT_SECRET is set before the app loads so the auth middleware
//   can verify tokens. A helper (makeToken) signs a valid test JWT.
//   mockDb intercepts all inline Prisma calls in the route handlers.
//   Each service module is mocked with jest.fn() stubs.
//
// Run with: npm run test:integration

// ─── Environment must be set before the app is required ──────────────────────
process.env.JWT_SECRET = 'test-secret-for-jest';

// ─── Prisma mock (intercepts inline DB calls in route handlers) ───────────────
const mockDb = {
  stackingEnrollment: {
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
  },
  stackingScheduleEntry: {
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    findMany:   jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockDb),
}));

// ─── Service mocks ────────────────────────────────────────────────────────────
jest.mock('../../services/activationService', () => ({
  runOnAppOpen:               jest.fn(),
  acceptActivation:           jest.fn(),
  snoozeActivationSuggestion: jest.fn(),
  manuallyUnlockHabit:        jest.fn(),
}));

jest.mock('../../services/stackingTriggerService', () => ({
  generateSuggestedRanking: jest.fn(),
}));

jest.mock('../../services/enrollmentService', () => ({
  enrollUserInStacking:    jest.fn(),
  optOutOfStacking:        jest.fn(),
  addHabitToActiveSchedule: jest.fn(),
  reorderPendingEntries:   jest.fn(),
}));

jest.mock('../../services/provingWindowService', () => ({
  checkProvingWindowProgress: jest.fn(),
  runProvingWindowCheckForUser: jest.fn(),
}));

// ─── Also mock lib/prisma (used by other route files loaded via server.js) ────
jest.mock('openai', () => jest.fn().mockImplementation(() => ({})));
jest.mock('../../lib/prisma', () => ({
  habit:              { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), delete: jest.fn() },
  habitCheckIn:       { findMany: jest.fn(), findFirst: jest.fn(), upsert: jest.fn(), create: jest.fn(), update: jest.fn() },
  user:               { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  userBadge:          { createMany: jest.fn(), findMany: jest.fn() },
  stackingEnrollment: { findFirst: jest.fn(), findUnique: jest.fn() },
  $transaction:       jest.fn(),
}));

const request = require('supertest');
const app     = require('../../server');
const jwt     = require('jsonwebtoken');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Signs a JWT for a test user — matches the shape authenticateToken expects. */
function makeToken(userId = 'user-test-1') {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const VALID_TOKEN = makeToken();
const AUTH        = { Authorization: `Bearer ${VALID_TOKEN}` };

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Auth middleware ───────────────────────────────────────────────────────────
// Every stacking endpoint uses authenticateToken. Spot-check a representative
// selection of routes rather than repeating the same assertion 13 times.

describe('Auth middleware enforcement', () => {
  const unauthenticatedCases = [
    ['GET',  '/stacking/ranking'],
    ['GET',  '/stacking/enrollment'],
    ['POST', '/stacking/enroll'],
    ['POST', '/stacking/opt-out'],
    ['POST', '/stacking/accept'],
    ['POST', '/stacking/snooze'],
    ['POST', '/stacking/unlock'],
    ['POST', '/stacking/reorder'],
    ['POST', '/stacking/app-open'],
    ['GET',  '/stacking/progress/some-enrollment-id'],
    ['GET',  '/stacking/entry/some-entry-id'],
    ['GET',  '/stacking/schedule/some-enrollment-id'],
  ];

  test.each(unauthenticatedCases)(
    '%s %s returns 401 with no token',
    async (method, path) => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.statusCode).toBe(401);
    }
  );

  test('returns 403 when token is invalid', async () => {
    const res = await request(app)
      .get('/stacking/enrollment')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.statusCode).toBe(403);
  });

  test('returns 403 when token is signed with wrong secret', async () => {
    const badToken = jwt.sign({ userId: 'user-1' }, 'wrong-secret');
    const res = await request(app)
      .get('/stacking/enrollment')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.statusCode).toBe(403);
  });
});

// ─── POST /stacking/enroll ────────────────────────────────────────────────────

describe('POST /stacking/enroll', () => {

  test('400 when rankedHabitIds is missing', async () => {
    const res = await request(app)
      .post('/stacking/enroll')
      .set(AUTH)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/rankedHabitIds/i);
  });

  test('400 when rankedHabitIds is not an array', async () => {
    const res = await request(app)
      .post('/stacking/enroll')
      .set(AUTH)
      .send({ rankedHabitIds: 'habit-1' });
    expect(res.statusCode).toBe(400);
  });

  test('400 when rankedHabitIds is an empty array', async () => {
    const res = await request(app)
      .post('/stacking/enroll')
      .set(AUTH)
      .send({ rankedHabitIds: [] });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/empty/i);
  });

  test('409 when user already has an active enrollment', async () => {
    mockDb.stackingEnrollment.findFirst.mockResolvedValue({ id: 'enrollment-1', status: 'ACTIVE' });

    const res = await request(app)
      .post('/stacking/enroll')
      .set(AUTH)
      .send({ rankedHabitIds: ['habit-1', 'habit-2'] });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already enrolled/i);
  });

  test('201 with enrollment object on success', async () => {
    mockDb.stackingEnrollment.findFirst.mockResolvedValue(null);
    const { enrollUserInStacking } = require('../../services/enrollmentService');
    enrollUserInStacking.mockResolvedValue({ id: 'enrollment-new', status: 'ACTIVE' });

    const res = await request(app)
      .post('/stacking/enroll')
      .set(AUTH)
      .send({ rankedHabitIds: ['habit-1', 'habit-2'] });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('enrollment');
  });
});

// ─── POST /stacking/opt-out ───────────────────────────────────────────────────

describe('POST /stacking/opt-out', () => {

  test('400 when enrollmentId is missing', async () => {
    const res = await request(app)
      .post('/stacking/opt-out')
      .set(AUTH)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/enrollmentId/i);
  });

  test('404 when enrollment does not exist', async () => {
    mockDb.stackingEnrollment.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/stacking/opt-out')
      .set(AUTH)
      .send({ enrollmentId: 'nonexistent' });
    expect(res.statusCode).toBe(404);
  });

  test('400 when enrollment exists but is not active', async () => {
    mockDb.stackingEnrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1', status: 'COMPLETED', userId: 'user-test-1',
    });

    const res = await request(app)
      .post('/stacking/opt-out')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/not active/i);
  });

  test('403 when enrollment belongs to a different user', async () => {
    mockDb.stackingEnrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1', status: 'ACTIVE', userId: 'different-user',
    });

    const res = await request(app)
      .post('/stacking/opt-out')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1' });
    expect(res.statusCode).toBe(403);
  });

  test('200 with success message on valid opt-out', async () => {
    mockDb.stackingEnrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1', status: 'ACTIVE', userId: 'user-test-1',
    });
    const { optOutOfStacking } = require('../../services/enrollmentService');
    optOutOfStacking.mockResolvedValue();

    const res = await request(app)
      .post('/stacking/opt-out')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/opted out/i);
  });
});

// ─── POST /stacking/accept ────────────────────────────────────────────────────

describe('POST /stacking/accept', () => {

  test('400 when entryId is missing', async () => {
    const res = await request(app)
      .post('/stacking/accept')
      .set(AUTH)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/entryId/i);
  });

  test('404 when entry does not exist', async () => {
    mockDb.stackingScheduleEntry.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/stacking/accept')
      .set(AUTH)
      .send({ entryId: 'nonexistent' });
    expect(res.statusCode).toBe(404);
  });

  test('400 when entry exists but is not pending', async () => {
    mockDb.stackingScheduleEntry.findUnique.mockResolvedValue({
      id: 'entry-1', status: 'ACTIVE',
    });

    const res = await request(app)
      .post('/stacking/accept')
      .set(AUTH)
      .send({ entryId: 'entry-1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/not pending/i);
  });

  test('200 when entry is pending and activation succeeds', async () => {
    mockDb.stackingScheduleEntry.findUnique.mockResolvedValue({
      id: 'entry-1', status: 'PENDING',
    });
    const { acceptActivation } = require('../../services/activationService');
    acceptActivation.mockResolvedValue();

    const res = await request(app)
      .post('/stacking/accept')
      .set(AUTH)
      .send({ entryId: 'entry-1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/activated/i);
  });
});

// ─── POST /stacking/snooze ────────────────────────────────────────────────────

describe('POST /stacking/snooze', () => {

  test('400 when entryId is missing', async () => {
    const res = await request(app)
      .post('/stacking/snooze')
      .set(AUTH)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/entryId/i);
  });

  test('200 with resurfaceAt date on valid snooze', async () => {
    const { snoozeActivationSuggestion } = require('../../services/activationService');
    const resurfaceAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    snoozeActivationSuggestion.mockResolvedValue({ resurfaceAt });

    const res = await request(app)
      .post('/stacking/snooze')
      .set(AUTH)
      .send({ entryId: 'entry-1' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('resurfaceAt');
    expect(res.body.message).toMatch(/snoozed/i);
  });
});

// ─── POST /stacking/unlock ────────────────────────────────────────────────────

describe('POST /stacking/unlock', () => {

  test('400 when enrollmentId is missing', async () => {
    const res = await request(app)
      .post('/stacking/unlock')
      .set(AUTH)
      .send({ targetHabitId: 'habit-1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/enrollmentId/i);
  });

  test('400 when targetHabitId is missing', async () => {
    const res = await request(app)
      .post('/stacking/unlock')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/targetHabitId/i);
  });

  test('400 when service returns null (invalid enrollment or habit)', async () => {
    const { manuallyUnlockHabit } = require('../../services/activationService');
    manuallyUnlockHabit.mockResolvedValue(null);

    const res = await request(app)
      .post('/stacking/unlock')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1', targetHabitId: 'habit-1' });
    expect(res.statusCode).toBe(400);
  });

  test('200 with activatedHabitId on successful unlock', async () => {
    const { manuallyUnlockHabit } = require('../../services/activationService');
    manuallyUnlockHabit.mockResolvedValue({ activatedHabitId: 'habit-1', manualUnlockSuccess: true });

    const res = await request(app)
      .post('/stacking/unlock')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1', targetHabitId: 'habit-1' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('activatedHabitId', 'habit-1');
  });
});

// ─── POST /stacking/reorder ───────────────────────────────────────────────────

describe('POST /stacking/reorder', () => {

  test('400 when enrollmentId is missing', async () => {
    const res = await request(app)
      .post('/stacking/reorder')
      .set(AUTH)
      .send({ reorderedHabitIds: ['habit-1'] });
    expect(res.statusCode).toBe(400);
  });

  test('400 when reorderedHabitIds is missing', async () => {
    const res = await request(app)
      .post('/stacking/reorder')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1' });
    expect(res.statusCode).toBe(400);
  });

  test('400 when reorderedHabitIds is not an array', async () => {
    const res = await request(app)
      .post('/stacking/reorder')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1', reorderedHabitIds: 'habit-1' });
    expect(res.statusCode).toBe(400);
  });

  test('200 on successful reorder', async () => {
    const { reorderPendingEntries } = require('../../services/enrollmentService');
    reorderPendingEntries.mockResolvedValue();

    const res = await request(app)
      .post('/stacking/reorder')
      .set(AUTH)
      .send({ enrollmentId: 'enrollment-1', reorderedHabitIds: ['habit-2', 'habit-1'] });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/reordered/i);
  });
});

// ─── GET /stacking/enrollment ─────────────────────────────────────────────────

describe('GET /stacking/enrollment', () => {

  test('200 with null enrollmentId when no active enrollment exists', async () => {
    mockDb.stackingEnrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/stacking/enrollment')
      .set(AUTH);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ enrollmentId: null });
  });

  test('200 with enrollmentId when active enrollment exists', async () => {
    mockDb.stackingEnrollment.findFirst.mockResolvedValue({ id: 'enrollment-abc', status: 'ACTIVE' });

    const res = await request(app)
      .get('/stacking/enrollment')
      .set(AUTH);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ enrollmentId: 'enrollment-abc' });
  });
});

// ─── GET /stacking/ranking ────────────────────────────────────────────────────

describe('GET /stacking/ranking', () => {

  test('200 with ranking array on success', async () => {
    const { generateSuggestedRanking } = require('../../services/stackingTriggerService');
    generateSuggestedRanking.mockResolvedValue([
      { habitId: 'habit-1', name: 'Exercise', tier: 'TIER_2', consistencyScore: 0.72 },
      { habitId: 'habit-2', name: 'Journaling', tier: 'TIER_3', consistencyScore: 0.48 },
    ]);

    const res = await request(app)
      .get('/stacking/ranking')
      .set(AUTH);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ranking');
    expect(Array.isArray(res.body.ranking)).toBe(true);
    expect(res.body.ranking).toHaveLength(2);
  });
});

// ─── GET /stacking/progress/:enrollmentId ─────────────────────────────────────

describe('GET /stacking/progress/:enrollmentId', () => {

  test('404 when no active entry exists for enrollment', async () => {
    mockDb.stackingScheduleEntry.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/stacking/progress/enrollment-1')
      .set(AUTH);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/no active entry/i);
  });

  test('200 with progress data when active entry exists', async () => {
    mockDb.stackingScheduleEntry.findFirst.mockResolvedValue({ id: 'entry-1', status: 'ACTIVE' });
    const { checkProvingWindowProgress } = require('../../services/provingWindowService');
    checkProvingWindowProgress.mockResolvedValue({
      consistencyScore: 0.75,
      unlockThreshold:  0.80,
      daysRemaining:    4,
      windowComplete:   false,
    });

    const res = await request(app)
      .get('/stacking/progress/enrollment-1')
      .set(AUTH);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('progress');
    expect(res.body.progress).toHaveProperty('consistencyScore');
  });
});

// ─── GET /stacking/entry/:entryId ────────────────────────────────────────────

describe('GET /stacking/entry/:entryId', () => {

  test('404 when entry does not exist', async () => {
    mockDb.stackingScheduleEntry.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/stacking/entry/nonexistent')
      .set(AUTH);
    expect(res.statusCode).toBe(404);
  });

  test('200 with entry details including habit name', async () => {
    mockDb.stackingScheduleEntry.findUnique.mockResolvedValue({
      id:          'entry-1',
      habitId:     'habit-1',
      status:      'PENDING',
      priorityRank: 1,
      habit:       { name: 'Morning Run' },
    });

    const res = await request(app)
      .get('/stacking/entry/entry-1')
      .set(AUTH);
    expect(res.statusCode).toBe(200);
    expect(res.body.habitName).toBe('Morning Run');
    expect(res.body.status).toBe('PENDING');
  });
});

// ─── POST /stacking/add-habit ─────────────────────────────────────────────────

describe('POST /stacking/add-habit', () => {

  test('400 when habitId is missing', async () => {
    const res = await request(app)
      .post('/stacking/add-habit')
      .set(AUTH)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/habitId/i);
  });

  test('200 when user has no active enrollment (habit added normally)', async () => {
    const { addHabitToActiveSchedule } = require('../../services/enrollmentService');
    addHabitToActiveSchedule.mockResolvedValue(null);

    const res = await request(app)
      .post('/stacking/add-habit')
      .set(AUTH)
      .send({ habitId: 'habit-1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/no active enrollment/i);
  });

  test('201 when habit is added to an active schedule', async () => {
    const { addHabitToActiveSchedule } = require('../../services/enrollmentService');
    addHabitToActiveSchedule.mockResolvedValue({ enrollmentId: 'enrollment-1', newEntryId: 'entry-new' });

    const res = await request(app)
      .post('/stacking/add-habit')
      .set(AUTH)
      .send({ habitId: 'habit-1' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('enrollmentId');
    expect(res.body).toHaveProperty('newEntryId');
  });
});