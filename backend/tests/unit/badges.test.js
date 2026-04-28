// tests/unit/badges.test.js

const { evaluateNewBadges, BADGE_DEFINITIONS, getBadgeDefinition } = require('../../lib/badges');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A habit that won't trigger any badge on its own. */
function baseHabit(overrides = {}) {
  return {
    id:               'habit-1',
    frequency:        'DAILY',
    currentStreak:    0,
    consistencyScore: null,
    habitAgeDays:     1,
    ...overrides,
  };
}

/** A minimal context that qualifies for nothing. */
function baseContext(overrides = {}) {
  return {
    accountAgeDays: 1,
    totalPoints:    0,
    habits:         [baseHabit()],
    ...overrides,
  };
}

// ─── General evaluator behaviour ─────────────────────────────────────────────

describe('evaluateNewBadges — general', () => {
  test('returns empty array when nothing qualifies', () => {
    const result = evaluateNewBadges(baseContext(), new Set());
    expect(result).toEqual([]);
  });

  test('skips badges the user already has', () => {
    const ctx    = baseContext({ accountAgeDays: 365 });
    const earned = new Set(['starting_out', 'getting_into_it', 'really_habitual']);
    const result = evaluateNewBadges(ctx, earned);
    expect(result).not.toContain('starting_out');
    expect(result).not.toContain('getting_into_it');
    expect(result).not.toContain('really_habitual');
  });

  test('can award multiple badges in one call', () => {
    const ctx = baseContext({
      accountAgeDays: 30,
      habits: [baseHabit({ currentStreak: 7 })],
    });
    const result = evaluateNewBadges(ctx, new Set());
    expect(result).toContain('starting_out');
    expect(result).toContain('getting_into_it');
    expect(result).toContain('streak_starter');
  });
});

// ─── Time-based badges ────────────────────────────────────────────────────────

describe('starting_out', () => {
  test('not awarded before 7 days', () => {
    const result = evaluateNewBadges(baseContext({ accountAgeDays: 6 }), new Set());
    expect(result).not.toContain('starting_out');
  });

  test('awarded at exactly 7 days', () => {
    const result = evaluateNewBadges(baseContext({ accountAgeDays: 7 }), new Set());
    expect(result).toContain('starting_out');
  });
});

describe('getting_into_it', () => {
  test('not awarded at 29 days', () => {
    const result = evaluateNewBadges(baseContext({ accountAgeDays: 29 }), new Set());
    expect(result).not.toContain('getting_into_it');
  });

  test('awarded at 30 days', () => {
    const result = evaluateNewBadges(baseContext({ accountAgeDays: 30 }), new Set());
    expect(result).toContain('getting_into_it');
  });
});

describe('really_habitual', () => {
  test('not awarded at 364 days', () => {
    const result = evaluateNewBadges(baseContext({ accountAgeDays: 364 }), new Set());
    expect(result).not.toContain('really_habitual');
  });

  test('awarded at 365 days', () => {
    const result = evaluateNewBadges(baseContext({ accountAgeDays: 365 }), new Set());
    expect(result).toContain('really_habitual');
  });
});

// ─── Streak-based badges ──────────────────────────────────────────────────────

describe('streak_starter', () => {
  test('not awarded below 7', () => {
    const ctx = baseContext({ habits: [baseHabit({ currentStreak: 6 })] });
    expect(evaluateNewBadges(ctx, new Set())).not.toContain('streak_starter');
  });

  test('awarded at exactly 7', () => {
    const ctx = baseContext({ habits: [baseHabit({ currentStreak: 7 })] });
    expect(evaluateNewBadges(ctx, new Set())).toContain('streak_starter');
  });

  test('awarded if ANY habit crosses threshold', () => {
    const ctx = baseContext({
      habits: [baseHabit({ id: 'a', currentStreak: 3 }), baseHabit({ id: 'b', currentStreak: 7 })],
    });
    expect(evaluateNewBadges(ctx, new Set())).toContain('streak_starter');
  });
});

describe('streak_warrior', () => {
  test('awarded at 30', () => {
    const ctx = baseContext({ habits: [baseHabit({ currentStreak: 30 })] });
    expect(evaluateNewBadges(ctx, new Set())).toContain('streak_warrior');
  });
});

describe('streak_legend', () => {
  test('awarded at 100', () => {
    const ctx = baseContext({ habits: [baseHabit({ currentStreak: 100 })] });
    expect(evaluateNewBadges(ctx, new Set())).toContain('streak_legend');
  });
});

// ─── Consistency-based badges ─────────────────────────────────────────────────

describe('humble_leaf', () => {
  test('not awarded if habit is too young (< 30 days)', () => {
    const ctx = baseContext({
      habits: [baseHabit({ habitAgeDays: 20, consistencyScore: 0.9 })],
    });
    expect(evaluateNewBadges(ctx, new Set())).not.toContain('humble_leaf');
  });

  test('not awarded if consistency too low', () => {
    const ctx = baseContext({
      habits: [baseHabit({ habitAgeDays: 30, consistencyScore: 0.79 })],
    });
    expect(evaluateNewBadges(ctx, new Set())).not.toContain('humble_leaf');
  });

  test('not awarded if consistencyScore is null', () => {
    const ctx = baseContext({
      habits: [baseHabit({ habitAgeDays: 60, consistencyScore: null })],
    });
    expect(evaluateNewBadges(ctx, new Set())).not.toContain('humble_leaf');
  });

  test('awarded when habit is 30+ days old and consistency >= 0.8', () => {
    const ctx = baseContext({
      habits: [baseHabit({ habitAgeDays: 30, consistencyScore: 0.8 })],
    });
    expect(evaluateNewBadges(ctx, new Set())).toContain('humble_leaf');
  });
});

describe('automaticity_achieved', () => {
  test('not awarded if habit under a year old', () => {
    const ctx = baseContext({
      habits: [baseHabit({ habitAgeDays: 364, consistencyScore: 0.96 })],
    });
    expect(evaluateNewBadges(ctx, new Set())).not.toContain('automaticity_achieved');
  });

  test('not awarded if consistency < 0.95', () => {
    const ctx = baseContext({
      habits: [baseHabit({ habitAgeDays: 365, consistencyScore: 0.94 })],
    });
    expect(evaluateNewBadges(ctx, new Set())).not.toContain('automaticity_achieved');
  });

  test('awarded when 365+ days old and consistency >= 0.95', () => {
    const ctx = baseContext({
      habits: [baseHabit({ habitAgeDays: 365, consistencyScore: 0.95 })],
    });
    expect(evaluateNewBadges(ctx, new Set())).toContain('automaticity_achieved');
  });
});

// ─── Points-based badges ──────────────────────────────────────────────────────

describe('point_collector', () => {
  test('not awarded below 100 points', () => {
    const ctx = baseContext({ totalPoints: 99 });
    expect(evaluateNewBadges(ctx, new Set())).not.toContain('point_collector');
  });

  test('awarded at exactly 100 points', () => {
    const ctx = baseContext({ totalPoints: 100 });
    expect(evaluateNewBadges(ctx, new Set())).toContain('point_collector');
  });
});

describe('point_hoarder', () => {
  test('awarded at 1000 points', () => {
    const ctx = baseContext({ totalPoints: 1000 });
    expect(evaluateNewBadges(ctx, new Set())).toContain('point_hoarder');
  });
});

// ─── getBadgeDefinition ───────────────────────────────────────────────────────

describe('getBadgeDefinition', () => {
  test('returns the correct definition for a valid id', () => {
    const def = getBadgeDefinition('starting_out');
    expect(def.name).toBe('Starting Out');
    expect(def.emoji).toBe('🌱');
  });

  test('returns undefined for an unknown id', () => {
    expect(getBadgeDefinition('nonexistent_badge')).toBeUndefined();
  });
});

// ─── Sanity: every definition has required fields ─────────────────────────────

describe('BADGE_DEFINITIONS integrity', () => {
  test.each(BADGE_DEFINITIONS)('$id has all required fields', (badge) => {
    expect(typeof badge.id).toBe('string');
    expect(typeof badge.name).toBe('string');
    expect(typeof badge.description).toBe('string');
    expect(typeof badge.emoji).toBe('string');
    expect(typeof badge.evaluate).toBe('function');
  });
});