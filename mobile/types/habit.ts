// ─── Habit Types ─────────────────────────────────────────────────────────────
// Single source of truth for habit-related types, derived directly from the
// Prisma schema. The frontend always sees camelCase field names.

// These must stay in sync with the Prisma schema enums.
export type HabitCategory =
  | 'FITNESS'
  | 'NUTRITION'
  | 'SLEEP'
  | 'PRODUCTIVITY'
  | 'WELLNESS'
  | 'OTHER';

export type HabitFrequency = 'DAILY' | 'WEEKLY';

/**
 * Mirrors the Habit model returned from the API.
 * IDs are UUIDs (strings) throughout — Prisma generates them via @default(uuid()).
 */
export interface Habit {
  id:             number;
  userId:         number;
  name:           string;
  description?:   string;
  habitCategory:  HabitCategory;
  frequency:      HabitFrequency;
  visibility:     boolean;   // true = public, false = private
  active:         boolean;
  currentStreak:  number;    // stored on the row and updated on each check-in
  priorityRank?:  number;
  createdAt:      string;    // ISO-8601 string
  updatedAt:      string;    // ISO-8601 string
}

/**
 * Payload sent to POST /habits (create).
 * userId is injected server-side from the auth session — never sent by the client.
 * currentStreak starts at 0 by default (handled by the database).
 */
export interface CreateHabitPayload {
  name:           string;
  description?:   string;
  habitCategory:  HabitCategory;
  frequency:      HabitFrequency;
  visibility?:    boolean;   // defaults to true (public) if omitted
  active?:        boolean;   // defaults to true if omitted
  priorityRank?:  number;
}

/**
 * Payload sent to PATCH /habits/:id (update).
 * All fields are optional — only the ones present will be updated.
 */
export interface UpdateHabitPayload {
  name?:          string;
  description?:   string;
  habitCategory?: HabitCategory;
  frequency?:     HabitFrequency;
  visibility?:    boolean;
  active?:        boolean;
  priorityRank?:  number;
}

// ─── CheckIn types ────────────────────────────────────────────────────────────

/**
 * Mirrors the HabitCheckIn model.
 * Each row represents one completed instance of a habit on a given date.
 */
export interface HabitCheckIn {
  id:      number;
  habitId: number;
  date:    string; // ISO-8601 string
}

// ─── Stats / Detail types (used by habit-detail.tsx) ─────────────────────────

export type CompletionValue = true | false | null; // completed | missed | future

export interface HabitStats {
  habitId:          number;
  currentStreak:    number; // sourced directly from the Habit row
  bestStreak:       number; // computed from checkIns
  totalCompletions: number;
  totalDays:        number;
  /** 35 entries covering the last 5 weeks, Sunday → Saturday columns. */
  completionGrid:   CompletionValue[];
}

export interface HabitDetail extends Habit {
  stats: HabitStats;
}