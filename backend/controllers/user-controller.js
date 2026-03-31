/**
 * controllers/user-controller.js
 *
 * Handles all user-level operations:
 *   GET  /users/:id          → getUserProfile
 *   PATCH /users/:id         → updateUserProfile   (email, password, publicTag, isPublic, photoUri)
 *   GET  /users/:id/settings → getUserSettings
 *   PATCH /users/:id/settings → updateUserSettings (theme, habitStacking, notifications)
 *
 * The `settings` column is a Prisma Json field (PostgreSQL JSONB).
 * We deep-merge incoming settings with existing ones so callers only need to
 * send the keys they want to change — not the entire settings object.
 *
 * Prerequisites:
 *   npm install bcrypt
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// ─── Shape of the JSONB settings field ───────────────────────────────────────
// Keep this in sync with types/user.ts on the frontend.
//
// {
//   theme:         'light' | 'dark' | 'nature'
//   habitStacking: boolean
//   notifications: boolean
//   publicTag:     string          ← display handle, e.g. "@greenleaf_user"
//   isPublic:      boolean         ← profile visibility toggle
//   photoUri:      string | null   ← avatar URL / local URI
// }

const DEFAULT_SETTINGS = {
  theme:         'light',
  habitStacking: false,
  notifications: false,
  publicTag:     '',
  isPublic:      true,
  photoUri:      null,
};

// ─── Ownership guard ──────────────────────────────────────────────────────────
// Reusable helper — confirm the requesting user owns the target user record.
function isOwner(req, targetId) {
  return req.user.userId === targetId;
}

// ─── Controller functions ─────────────────────────────────────────────────────

/**
 * GET /users/:id
 * Returns the user's profile.  Password is never included in the response.
 */
async function getUserProfile(req, res, next) {
  try {
    console.log('Get User Profile - Request received');
    const userId = req.user.userId;
    console.log('Get User Profile - Request received for user ID:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:       true,
        email:    true,
        timezone: true,
        creation: true,
        settings: true,   // JSONB — contains publicTag, isPublic, photoUri, etc.
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Merge stored settings with defaults so the client always gets a full object
    const settings = { ...DEFAULT_SETTINGS, ...(user.settings ?? {}) };

    res.json({ data: { ...user, settings } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /users/:id
 * Partial update for profile fields.
 *
 * Accepted body keys:
 *   email     - new email address (must be unique)
 *   password  - new plain-text password (will be hashed before storage)
 *   publicTag - display handle
 *   isPublic  - profile visibility
 *   photoUri  - avatar URI / URL
 *
 * Note: publicTag, isPublic, and photoUri are stored inside the JSONB
 *       settings field and deep-merged so other settings keys are preserved.
 */
async function updateUserProfile(req, res, next) {
  try {
    const userId = req.user.userId;

    const body = req.body;
    const userUpdate = {};          // Goes into the user table row
    const settingsUpdate = {};      // Gets merged into settings JSONB

    // ── Email ──────────────────────────────────────────────────────────────
    if (body.email !== undefined) {
      if (typeof body.email !== 'string' || !body.email.includes('@')) {
        res.status(400).json({ error: 'Invalid email address' });
        return;
      }
      userUpdate.email = body.email.trim().toLowerCase();
    }

    // ── Password ───────────────────────────────────────────────────────────
    if (body.password !== undefined) {
      if (typeof body.password !== 'string' || body.password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      userUpdate.password = await bcrypt.hash(body.password, SALT_ROUNDS);
    }

    // ── Settings-backed profile fields ─────────────────────────────────────
    if (body.publicTag !== undefined) {
      if (typeof body.publicTag !== 'string') {
        res.status(400).json({ error: '`publicTag` must be a string' });
        return;
      }
      settingsUpdate.publicTag = body.publicTag.trim();
    }

    if (body.isPublic !== undefined) {
      settingsUpdate.isPublic = Boolean(body.isPublic);
    }

    if (body.photoUri !== undefined) {
      // null is valid — it clears the avatar
      settingsUpdate.photoUri = body.photoUri === null ? null : String(body.photoUri);
    }

    // ── Nothing sent? ──────────────────────────────────────────────────────
    const hasUserChanges    = Object.keys(userUpdate).length > 0;
    const hasSettingsChanges = Object.keys(settingsUpdate).length > 0;

    if (!hasUserChanges && !hasSettingsChanges) {
      res.status(400).json({ error: 'No fields provided to update' });
      return;
    }

    // ── If settings changed, deep-merge with existing JSONB ────────────────
    if (hasSettingsChanges) {
      const current = await prisma.user.findUnique({
        where:  { id: userId },
        select: { settings: true },
      });
      userUpdate.settings = {
        ...DEFAULT_SETTINGS,
        ...(current?.settings ?? {}),
        ...settingsUpdate,
      };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data:  userUpdate,
      select: {
        id:       true,
        email:    true,
        timezone: true,
        creation: true,
        settings: true,
      },
    });

    res.json({
      data: {
        ...updated,
        settings: { ...DEFAULT_SETTINGS, ...(updated.settings ?? {}) },
      },
    });
  } catch (err) {
    // Unique-constraint violation → email already taken
    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    next(err);
  }
}

/**
 * GET /users/:id/settings
 * Returns only the settings portion of the user record.
 * Useful when the settings screen mounts independently of the profile screen.
 */
async function getUserSettings(req, res, next) {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { settings: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const settings = { ...DEFAULT_SETTINGS, ...(user.settings ?? {}) };
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /users/:id/settings
 * Deep-merges the supplied keys into the settings JSONB.
 *
 * Accepted body keys (all optional):
 *   theme         - 'light' | 'dark' | 'nature'
 *   habitStacking - boolean
 *   notifications - boolean
 *   publicTag     - string
 *   isPublic      - boolean
 *   photoUri      - string | null
 */
async function updateUserSettings(req, res, next) {
  try {
    const userId = req.user.userId;

    const body = req.body;
    const incoming = {};

    // ── theme ──────────────────────────────────────────────────────────────
    const VALID_THEMES = ['light', 'dark', 'nature'];
    if (body.theme !== undefined) {
      if (!VALID_THEMES.includes(body.theme)) {
        res.status(400).json({ error: `\`theme\` must be one of: ${VALID_THEMES.join(', ')}` });
        return;
      }
      incoming.theme = body.theme;
    }

    // ── Booleans ───────────────────────────────────────────────────────────
    if (body.habitStacking !== undefined) incoming.habitStacking = Boolean(body.habitStacking);
    if (body.notifications !== undefined) incoming.notifications = Boolean(body.notifications);
    if (body.isPublic      !== undefined) incoming.isPublic      = Boolean(body.isPublic);

    // ── Strings ────────────────────────────────────────────────────────────
    if (body.publicTag !== undefined) incoming.publicTag = String(body.publicTag).trim();
    if (body.photoUri  !== undefined) incoming.photoUri  = body.photoUri === null ? null : String(body.photoUri);

    if (Object.keys(incoming).length === 0) {
      res.status(400).json({ error: 'No settings fields provided' });
      return;
    }

    // Fetch current settings to merge
    const current = await prisma.user.findUnique({
      where:  { id: userId },
      select: { settings: true },
    });

    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const merged = {
      ...DEFAULT_SETTINGS,
      ...(current.settings ?? {}),
      ...incoming,
    };

    await prisma.user.update({
      where: { id: userId },
      data:  { settings: merged },
    });

    res.json({ data: merged });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUserProfile, updateUserProfile, getUserSettings, updateUserSettings };