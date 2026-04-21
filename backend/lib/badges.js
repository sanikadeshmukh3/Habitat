/**
 * lib/badges.js
 *
 * All badge definitions live here. To add a new badge, add one object to
 * BADGE_DEFINITIONS — the evaluator handles the rest automatically.
 *
 * Badge evaluation is side-effect free: returns which badge IDs the user
 * newly qualifies for. The caller (checkinService.js) writes them to the DB.
 */

// ─── Badge catalogue ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} HabitBadgeData
 * @property {string}       id
 * @property {string}       frequency         - 'DAILY' | 'WEEKLY' | 'MONTHLY'
 * @property {number}       currentStreak
 * @property {number|null}  consistencyScore  - 0–1 float, null if window hasn't closed
 * @property {number}       habitAgeDays
 */

/**
 * @typedef {Object} BadgeContext
 * @property {number}           accountAgeDays
 * @property {number}           totalPoints
 * @property {HabitBadgeData[]} habits
 */

const BADGE_DEFINITIONS = [
  // ── Time-based ──────────────────────────────────────────────────────────────
  {
    id: 'starting_out',
    name: 'Starting Out',
    description: 'Used the app for a full week.',
    emoji: '🌱',
    /** @param {BadgeContext} ctx */
    evaluate: ({ accountAgeDays }) => accountAgeDays >= 7,
  },
  {
    id: 'getting_into_it',
    name: 'Getting Into It',
    description: 'Used the app for a full month.',
    emoji: '🌿',
    evaluate: ({ accountAgeDays }) => accountAgeDays >= 30,
  },
  {
    id: 'really_habitual',
    name: 'Really Habitual',
    description: 'Used the app for a full year.',
    emoji: '🌳',
    evaluate: ({ accountAgeDays }) => accountAgeDays >= 365,
  },

  // ── Consistency-based ────────────────────────────────────────────────────────
  {
    id: 'humble_leaf',
    name: 'Humble Leaf',
    description: 'Achieved 80%+ consistency on any habit tracked for at least a month.',
    emoji: '🍃',
    evaluate: ({ habits }) =>
      habits.some(
        (h) => h.habitAgeDays >= 30 && h.consistencyScore !== null && h.consistencyScore >= 0.8,
      ),
  },
  {
    id: 'automaticity_achieved',
    name: 'Automaticity Achieved',
    description: 'Maintained 95%+ consistency on any habit tracked for a full year.',
    emoji: '⚡',
    evaluate: ({ habits }) =>
      habits.some(
        (h) =>
          h.habitAgeDays >= 365 &&
          h.consistencyScore !== null &&
          h.consistencyScore >= 0.95,
      ),
  },

  // ── Streak-based ─────────────────────────────────────────────────────────────
  {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Reached a 7-day streak on any habit.',
    emoji: '🔥',
    evaluate: ({ habits }) => habits.some((h) => h.currentStreak >= 7),
  },
  {
    id: 'streak_warrior',
    name: 'Streak Warrior',
    description: 'Reached a 30-day (or 30-week) streak on any habit.',
    emoji: '⚔️',
    evaluate: ({ habits }) => habits.some((h) => h.currentStreak >= 30),
  },
  {
    id: 'streak_legend',
    name: 'Streak Legend',
    description: 'Reached a 100-day (or 100-week) streak on any habit.',
    emoji: '👑',
    evaluate: ({ habits }) => habits.some((h) => h.currentStreak >= 100),
  },

  // ── Points-based ─────────────────────────────────────────────────────────────
  {
    id: 'point_collector',
    name: 'Point Collector',
    description: 'Earned a total of 100 points.',
    emoji: '💎',
    evaluate: ({ totalPoints }) => totalPoints >= 100,
  },
  {
    id: 'point_hoarder',
    name: 'Point Hoarder',
    description: 'Earned a total of 1,000 points.',
    emoji: '🏆',
    evaluate: ({ totalPoints }) => totalPoints >= 1_000,
  },
];

// ─── Evaluator ────────────────────────────────────────────────────────────────

/**
 * Returns the IDs of badges the user newly qualifies for but hasn't earned yet.
 *
 * @param {BadgeContext} context
 * @param {Set<string>}  alreadyEarned  - Set of badgeId strings already in UserBadge
 * @returns {string[]}
 */
function evaluateNewBadges(context, alreadyEarned) {
  return BADGE_DEFINITIONS
    .filter((badge) => !alreadyEarned.has(badge.id) && badge.evaluate(context))
    .map((badge) => badge.id);
}

/**
 * Returns the full definition for a badge ID, or undefined if not found.
 * Useful for rendering badge info on the profile screen.
 *
 * @param {string} id
 */
function getBadgeDefinition(id) {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}

module.exports = {
  BADGE_DEFINITIONS,
  evaluateNewBadges,
  getBadgeDefinition,
};