/**
 * archetypes.js
 *
 * Determines which Habitat animal archetype
 * a user receives during Wrapped based on
 * weekly habit performance metrics.
 */

function determineArchetype({
  completionScore,
  consistencyScore,
  streakScore,
  activityScore,
  reflectionScore,
  dailyVariance,
}) {
  // ----------------------------
  // STRONG TIER
  // ----------------------------
  const strongTier =
    completionScore >= 0.7 &&
    consistencyScore >= 0.65;

  // ----------------------------
  // WEAK TIER
  // ----------------------------
  const weakTier =
    completionScore < 0.5 &&
    activityScore < 0.5 &&
    consistencyScore < 0.5;

  if (strongTier) {
    // Wolf → top performer
    if (
      completionScore >= 0.85 &&
      consistencyScore >= 0.8 &&
      streakScore >= 0.7 &&
      dailyVariance <= 0.25
    ) {
      return {
        animal: "Wolf",
        title: "Relentless Wolf",
        tier: "strong",
      };
    }

    // Owl → reflective user
    if (reflectionScore >= 0.7) {
      return {
        animal: "Owl",
        title: "Mindful Owl",
        tier: "strong",
      };
    }

    // Bear → default strong
    return {
      animal: "Bear",
      title: "Steady Bear",
      tier: "strong",
    };
  }

  // ----------------------------
  // WEAK TIER
  // ----------------------------
  if (weakTier) {
    return {
      animal: "Sloth",
      title: "Recovering Sloth",
      tier: "weak",
    };
  }

  // ----------------------------
  // AVERAGE TIER
  // ----------------------------
  return {
    animal: "Monkey",
    title: "Adaptive Monkey",
    tier: "average",
  };
}

module.exports = {
  determineArchetype,
};