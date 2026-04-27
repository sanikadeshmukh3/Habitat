// tests/unit/user-controller.test.js

/**
 * Unit tests for controllers/user-controller.js
 *
 * Prisma and bcrypt are fully mocked — no database or network access occurs.
 * Each describe block covers one controller function and tests every user-
 * facing action: happy paths, validation failures, and error responses.
 *
 * Run with:  npx jest user-controller
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────
// jest.mock() is hoisted before any require(), so the controller module always
// receives the mocked versions of @prisma/client and bcrypt on load.

jest.mock('@prisma/client', () => {
  // mockUser is created once and captured in closure.  Every call to
  // `new PrismaClient()` — including the one inside the controller module —
  // returns the same object, so our test-side references stay in sync.
  const mockUser = {
    findUnique: jest.fn(),
    update:     jest.fn(),
  };
  return { PrismaClient: jest.fn(() => ({ user: mockUser })) };
});

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash:    jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const bcrypt           = require('bcrypt');

// Call PrismaClient() once here to obtain a reference to the same mock object
// the controller module already holds internally (because the factory always
// returns the same mockUser via closure).
const db = new PrismaClient();

const {
  getUserProfile,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
} = require('../../controllers/user-controller');

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const USER_ID = 'user-abc';

/** Full user row as Prisma returns it (password is always excluded). */
const DB_USER = {
  id:        USER_ID,
  email:     'alice@example.com',
  firstName: 'Alice',
  lastName:  'Smith',
  timezone:  'America/New_York',
  creation:  '2024-01-01T00:00:00.000Z',
  points:    42,
  badges:    [],
  settings:  null, // null forces the controller to fall back to DEFAULT_SETTINGS
};

const DEFAULT_SETTINGS = {
  theme:         'light',
  habitStacking: false,
  notifications: false,
  isPublic:      true,
};

// ─── Request / response helpers ───────────────────────────────────────────────

/** Builds a minimal Express-like request. */
function makeReq(overrides = {}) {
  return { user: { userId: USER_ID }, body: {}, params: {}, ...overrides };
}

/** Builds a spy-based Express response object. */
function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
  };
  return res;
}

const next = jest.fn();

// Clear all mock state before each test so calls and return values never leak.
beforeEach(() => jest.clearAllMocks());

// ─── getUserProfile ───────────────────────────────────────────────────────────

/**
 * getUserProfile (GET /users/me)
 *
 * Returns the authenticated user's full profile.  The critical invariant is
 * that DEFAULT_SETTINGS are always deep-merged into the DB result so the
 * client never receives a partial or null settings object.
 */
describe('getUserProfile', () => {
  /**
   * Happy path with no stored settings: the response must contain all
   * DEFAULT_SETTINGS keys at their default values alongside the profile data.
   */
  test('returns profile with DEFAULT_SETTINGS when DB settings is null', async () => {
    db.user.findUnique.mockResolvedValue(DB_USER);
    const res = makeRes();

    await getUserProfile(makeReq(), res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: { ...DB_USER, settings: DEFAULT_SETTINGS },
    });
  });

  /**
   * Partial DB settings: user has only `theme` stored.  The merged response
   * must fill in every missing key from DEFAULT_SETTINGS — the client must
   * never see undefined settings properties.
   */
  test('deep-merges partial DB settings with DEFAULT_SETTINGS', async () => {
    db.user.findUnique.mockResolvedValue({ ...DB_USER, settings: { theme: 'dark' } });
    const res = makeRes();

    await getUserProfile(makeReq(), res, next);

    const { settings } = res.json.mock.calls[0][0].data;
    expect(settings.theme).toBe('dark');
    expect(settings.habitStacking).toBe(false);  // filled from default
    expect(settings.notifications).toBe(false);  // filled from default
    expect(settings.isPublic).toBe(true);         // filled from default
  });

  /**
   * User not found in the DB: must respond 404 before any further processing.
   */
  test('returns 404 when user does not exist', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const res = makeRes();

    await getUserProfile(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });
});

// ─── updateUserProfile ────────────────────────────────────────────────────────

/**
 * updateUserProfile (PATCH /users/me)
 *
 * Accepts partial updates for email, password, firstName, lastName, and
 * isPublic (which is stored inside the settings JSONB).  Password changes
 * require the current password to be supplied and verified against the stored
 * hash before the new password is hashed and persisted.
 */
describe('updateUserProfile', () => {
  const UPDATED_USER = { ...DB_USER, settings: DEFAULT_SETTINGS };

  /**
   * Valid email update: the controller normalises (trims + lowercases) the
   * address, writes it to the DB, and returns the updated profile.
   */
  test('updates email and returns updated profile', async () => {
    db.user.update.mockResolvedValue({ ...UPDATED_USER, email: 'new@example.com' });
    const res = makeRes();

    await updateUserProfile(makeReq({ body: { email: 'new@example.com' } }), res, next);

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'new@example.com' }) }),
    );
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'new@example.com' }) });
  });

  /**
   * Malformed email (no '@'): must fail fast with 400 before any DB call.
   */
  test('returns 400 for an email without an @ symbol', async () => {
    const res = makeRes();

    await updateUserProfile(makeReq({ body: { email: 'notanemail' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  /**
   * Password change without `currentPassword`: the server must reject with 400
   * before performing any DB lookup — the field is required for security.
   */
  test('returns 400 when changing password without currentPassword', async () => {
    const res = makeRes();

    await updateUserProfile(makeReq({ body: { password: 'newpass123' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Current password') }),
    );
  });

  /**
   * New password shorter than 8 characters: must be rejected with 400 before
   * bcrypt is ever called — checking length is cheaper than hashing.
   */
  test('returns 400 when new password is fewer than 8 characters', async () => {
    const res = makeRes();

    await updateUserProfile(
      makeReq({ body: { password: 'short', currentPassword: 'oldpass' } }),
      res, next,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  /**
   * Wrong current password: bcrypt.compare returns false, so the controller
   * must respond 401 and must NOT write a new hash to the DB.
   */
  test('returns 401 when currentPassword does not match the stored hash', async () => {
    db.user.findUnique.mockResolvedValue({ password: 'hashed-old' });
    bcrypt.compare.mockResolvedValue(false);
    const res = makeRes();

    await updateUserProfile(
      makeReq({ body: { password: 'validnewpass', currentPassword: 'wrongpass' } }),
      res, next,
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  /**
   * Correct password flow: bcrypt.compare returns true, bcrypt.hash is called
   * with the new plain-text password, and the DB receives the hash — never the
   * raw password string.
   */
  test('hashes and saves new password when currentPassword is correct', async () => {
    db.user.findUnique.mockResolvedValue({ password: 'hashed-old' });
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashed-new');
    db.user.update.mockResolvedValue(UPDATED_USER);
    const res = makeRes();

    await updateUserProfile(
      makeReq({ body: { password: 'validnewpass', currentPassword: 'correctpass' } }),
      res, next,
    );

    expect(bcrypt.hash).toHaveBeenCalledWith('validnewpass', 10);
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: 'hashed-new' }) }),
    );
    expect(res.json).toHaveBeenCalled();
  });

  /**
   * Valid firstName update: leading/trailing whitespace must be stripped before
   * writing.
   */
  test('trims and updates firstName', async () => {
    db.user.update.mockResolvedValue({ ...UPDATED_USER, firstName: 'Bob' });
    const res = makeRes();

    await updateUserProfile(makeReq({ body: { firstName: '  Bob  ' } }), res, next);

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ firstName: 'Bob' }) }),
    );
  });

  /**
   * Whitespace-only firstName: rejected with 400 because every user must have
   * a non-empty displayable first name.
   */
  test('returns 400 for a whitespace-only firstName', async () => {
    const res = makeRes();

    await updateUserProfile(makeReq({ body: { firstName: '   ' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  /**
   * Clearing lastName with null is valid — the DB column allows null and the
   * controller must write exactly null, not the string 'null'.
   */
  test('sets lastName to null when null is explicitly sent', async () => {
    db.user.update.mockResolvedValue({ ...UPDATED_USER, lastName: null });
    const res = makeRes();

    await updateUserProfile(makeReq({ body: { lastName: null } }), res, next);

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastName: null }) }),
    );
  });

  /**
   * isPublic lives inside the settings JSONB, not as a top-level column.
   * Sending it must deep-merge into settings and must NOT produce a top-level
   * `isPublic` field in the Prisma update payload.
   */
  test('stores isPublic inside settings JSONB and not as a top-level column', async () => {
    db.user.findUnique.mockResolvedValue({ settings: { theme: 'dark' } });
    db.user.update.mockResolvedValue({ ...UPDATED_USER, settings: { ...DEFAULT_SETTINGS, isPublic: false } });
    const res = makeRes();

    await updateUserProfile(makeReq({ body: { isPublic: false } }), res, next);

    const updatePayload = db.user.update.mock.calls[0][0].data;
    expect(updatePayload.settings.isPublic).toBe(false);   // inside settings ✓
    expect(updatePayload.isPublic).toBeUndefined();          // not a column ✓
  });

  /**
   * Empty body: must reply 400 to avoid a meaningless no-op DB write.
   */
  test('returns 400 when no valid fields are provided', async () => {
    const res = makeRes();

    await updateUserProfile(makeReq({ body: {} }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  /**
   * Duplicate email (Prisma P2002 unique-constraint violation): the controller
   * must convert this into a user-friendly 409 Conflict rather than letting
   * the raw Prisma error bubble up to the client.
   */
  test('returns 409 when the new email is already taken (P2002)', async () => {
    const p2002 = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['email'] },
    });
    db.user.update.mockRejectedValue(p2002);
    const res = makeRes();

    await updateUserProfile(makeReq({ body: { email: 'taken@example.com' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already in use' });
  });
});

// ─── getUserSettings ──────────────────────────────────────────────────────────

/**
 * getUserSettings (GET /users/me/settings)
 *
 * Returns only the settings slice of the user record so the settings screen
 * can load without fetching the full profile.  Always merges with defaults so
 * the client receives a complete UserSettings object even when the JSONB column
 * is partial or null.
 */
describe('getUserSettings', () => {
  /**
   * Happy path with complete settings in the DB: the response must echo every
   * stored key and fill in nothing (all keys are already present).
   */
  test('returns the full settings object when all keys are stored', async () => {
    const stored = { theme: 'nature', habitStacking: true, notifications: true, isPublic: false };
    db.user.findUnique.mockResolvedValue({ settings: stored });
    const res = makeRes();

    await getUserSettings(makeReq(), res, next);

    expect(res.json).toHaveBeenCalledWith({ data: stored });
  });

  /**
   * Null settings in the DB: the controller must fall back to DEFAULT_SETTINGS
   * entirely — the response must never be null or an empty object.
   */
  test('returns DEFAULT_SETTINGS when DB settings is null', async () => {
    db.user.findUnique.mockResolvedValue({ settings: null });
    const res = makeRes();

    await getUserSettings(makeReq(), res, next);

    expect(res.json).toHaveBeenCalledWith({ data: DEFAULT_SETTINGS });
  });

  /**
   * User not found: must return 404 without crashing on a null spread.
   */
  test('returns 404 when user does not exist', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const res = makeRes();

    await getUserSettings(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── updateUserSettings ───────────────────────────────────────────────────────

/**
 * updateUserSettings (PATCH /users/me/settings)
 *
 * Deep-merges only the supplied keys into the settings JSONB.  Validates the
 * theme enum; coerces boolean fields; rejects empty payloads.  Critically,
 * sending one key must never erase the others.
 */
describe('updateUserSettings', () => {
  // Default database state: user exists with all-default settings.
  beforeEach(() => {
    db.user.findUnique.mockResolvedValue({ settings: { ...DEFAULT_SETTINGS } });
    db.user.update.mockResolvedValue({});
  });

  /**
   * Valid theme change: 'dark' is in VALID_THEMES, so the change is accepted,
   * written to the DB, and reflected in the response.
   */
  test('updates theme to a valid value and returns the merged settings', async () => {
    const res = makeRes();

    await updateUserSettings(makeReq({ body: { theme: 'dark' } }), res, next);

    const writtenSettings = db.user.update.mock.calls[0][0].data.settings;
    expect(writtenSettings.theme).toBe('dark');
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ theme: 'dark' }) });
  });

  /**
   * Invalid theme value: any string outside ['light', 'dark', 'nature'] must
   * be rejected with 400 before touching the DB.
   */
  test('returns 400 for an unrecognised theme value', async () => {
    const res = makeRes();

    await updateUserSettings(makeReq({ body: { theme: 'rainbow' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  /**
   * habitStacking toggle: boolean coercion stores exactly true (not a truthy
   * non-boolean) and all other settings keys remain present in the written object.
   */
  test('updates habitStacking and preserves all other settings keys', async () => {
    const res = makeRes();

    await updateUserSettings(makeReq({ body: { habitStacking: true } }), res, next);

    const writtenSettings = db.user.update.mock.calls[0][0].data.settings;
    expect(writtenSettings.habitStacking).toBe(true);
    // Unrelated keys must still be present after a partial update
    expect(writtenSettings.theme).toBeDefined();
    expect(writtenSettings.notifications).toBeDefined();
    expect(writtenSettings.isPublic).toBeDefined();
  });

  /**
   * notifications toggle: same pattern as habitStacking — validates boolean
   * storage for the second toggle field.
   */
  test('updates notifications', async () => {
    const res = makeRes();

    await updateUserSettings(makeReq({ body: { notifications: true } }), res, next);

    const writtenSettings = db.user.update.mock.calls[0][0].data.settings;
    expect(writtenSettings.notifications).toBe(true);
  });

  /**
   * isPublic can be toggled from the settings endpoint (not just the profile
   * endpoint).  Sending false must write exactly false into the JSONB.
   */
  test('updates isPublic to false', async () => {
    const res = makeRes();

    await updateUserSettings(makeReq({ body: { isPublic: false } }), res, next);

    const writtenSettings = db.user.update.mock.calls[0][0].data.settings;
    expect(writtenSettings.isPublic).toBe(false);
  });

  /**
   * Empty body: must reply 400 and skip the DB write entirely.
   */
  test('returns 400 when no settings fields are provided', async () => {
    const res = makeRes();

    await updateUserSettings(makeReq({ body: {} }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  /**
   * User not found during the fetch-for-merge step: must return 404 rather
   * than crashing when trying to spread current.settings.
   */
  test('returns 404 when user is not found during merge', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const res = makeRes();

    await updateUserSettings(makeReq({ body: { theme: 'dark' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  /**
   * Deep-merge correctness: the most important invariant for this endpoint.
   * Sending only `theme` must NOT overwrite other settings keys that deviate
   * from defaults.  This guards against an accidental whole-object replacement.
   */
  test('merges the incoming field without overwriting unrelated keys', async () => {
    // User has non-default state: notifications on, habitStacking on.
    db.user.findUnique.mockResolvedValue({
      settings: { ...DEFAULT_SETTINGS, notifications: true, habitStacking: true },
    });
    const res = makeRes();

    await updateUserSettings(makeReq({ body: { theme: 'dark' } }), res, next);

    const merged = db.user.update.mock.calls[0][0].data.settings;
    expect(merged.theme).toBe('dark');          // incoming change applied
    expect(merged.notifications).toBe(true);    // non-default value preserved
    expect(merged.habitStacking).toBe(true);    // non-default value preserved
  });
});