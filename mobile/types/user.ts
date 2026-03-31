/**
 * types/user.ts
 *
 * Single source of truth for all user-related shapes used across the app.
 * Keep this in sync with:
 *   - The Prisma `user` model (schema.prisma)
 *   - DEFAULT_SETTINGS in user-controller.js
 *   - profile.tsx / settings.tsx
 */

// ─── Settings (stored as JSONB on the user row) ───────────────────────────────

/** Valid theme values — mirrors the chip options in settings.tsx */
export type AppTheme = 'light' | 'dark' | 'nature';

/**
 * UserSettings
 *
 * Everything persisted inside the `settings` JSONB column.
 * Split into logical groups for readability, but it's a flat object in the DB.
 *
 * Appearance ──────────────────────────────────────────────────────────────────
 *   theme          Active colour scheme.
 *
 * Habits ──────────────────────────────────────────────────────────────────────
 *   habitStacking  When true, completing one habit auto-prompts the next.
 *
 * General ─────────────────────────────────────────────────────────────────────
 *   notifications  Whether the user wants push/local reminders.
 *
 * Profile (stored here because they don't have their own columns) ─────────────
 *   publicTag      Display handle shown on public profiles, e.g. "@greenleaf_user".
 *   isPublic       Controls whether the profile is visible to other users.
 *   photoUri       Avatar URL or local Expo URI. null = no photo (show initials).
 */
export interface UserSettings {
  // Appearance
  theme: AppTheme;

  // Habits
  habitStacking: boolean;

  // General
  notifications: boolean;

  // Profile extras (stored in JSONB because they have no dedicated columns)
  publicTag: string;
  isPublic:  boolean;
  photoUri:  string | null;
}

/** Default settings applied whenever a key is missing from the JSONB column */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme:         'light',
  habitStacking: false,
  notifications: false,
  publicTag:     '',
  isPublic:      true,
  photoUri:      null,
};

// ─── User profile ─────────────────────────────────────────────────────────────

/**
 * UserProfile
 *
 * Mirrors what GET /users/:id returns.
 * `password` is never included in API responses.
 */
export interface UserProfile {
  id:       string;
  email:    string;
  timezone: string | null;
  creation: string;           // ISO-8601 date string from JSON serialisation
  settings: UserSettings;
}

// ─── API payloads ─────────────────────────────────────────────────────────────

/**
 * UpdateProfilePayload
 * All fields are optional — only supply what you want to change.
 * Mirrors the accepted body of PATCH /users/:id.
 */
export interface UpdateProfilePayload {
  email?:     string;
  password?:  string;         // plain-text; hashed server-side
  publicTag?: string;
  isPublic?:  boolean;
  photoUri?:  string | null;
}

/**
 * UpdateSettingsPayload
 * All fields are optional — only supply what you want to change.
 * Mirrors the accepted body of PATCH /users/:id/settings.
 */
export interface UpdateSettingsPayload {
  theme?:         AppTheme;
  habitStacking?: boolean;
  notifications?: boolean;
  publicTag?:     string;
  isPublic?:      boolean;
  photoUri?:      string | null;
}