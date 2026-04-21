const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  hasCompletedObservationPeriod, // was hasCompletedTrialPeriod in original — renamed in consistencyService
  updateConsistencyScore,
} = require('./consistencyService');

// tier thresholds as constants so they're easy to adjust in one place
const TIER_THRESHOLDS = {
  TIER_1_MIN: 0.85, // 85% and above -> mastered
  TIER_2_MIN: 0.65, // 65–84%        -> developing
                    // below 65%     -> struggling (TIER_3)
};

// pure logic function — takes a score float and returns the correct tier string
const assignTier = (consistencyScore) => {
  if (consistencyScore >= TIER_THRESHOLDS.TIER_1_MIN) return 'TIER_1';
  if (consistencyScore >= TIER_THRESHOLDS.TIER_2_MIN) return 'TIER_2';
  return 'TIER_3';
};

// runs the full evaluation pipeline on a single habit:
// checks that the observation window has closed, recalculates the score,
// assigns the tier, and manages the grace period for previously mastered habits
const evaluateHabit = async (habitId) => {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });

  // observation window hasn't closed yet — nothing to evaluate
  if (!hasCompletedObservationPeriod(habit)) return null;

  const score   = await updateConsistencyScore(habitId);
  const newTier = assignTier(score);

  // grace period logic for habits that were previously TIER_1 and have slipped:
  // start the grace period clock the first time a TIER_1 habit drops below TIER_1
  // clear it if the habit recovers back to TIER_1
  let gracePeriodStart = habit.gracePeriodStart;

  if (habit.tier === 'TIER_1' && newTier !== 'TIER_1' && !habit.gracePeriodStart) {
    gracePeriodStart = new Date();
  } else if (newTier === 'TIER_1' && habit.gracePeriodStart) {
    gracePeriodStart = null;
  }

  const updatedHabit = await prisma.habit.update({
    where: { id: habitId },
    data: {
      tier: newTier,
      gracePeriodStart,
      updatedAt: new Date(),
    },
  });

  return updatedHabit;
};

// runs evaluateHabit across every active habit for a given user
// returns only the habits that were actually evaluated (window closed)
const evaluateAllHabitsForUser = async (userId) => {
  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
  });

  const results = await Promise.all(
    habits.map((habit) => evaluateHabit(habit.id))
  );

  return results.filter(Boolean); // strip nulls from habits whose window hasn't closed
};

// returns true if the 14-day grace period has elapsed for a previously mastered habit
// used by stackingTriggerService to decide whether to actually demote from TIER_1
const hasGracePeriodElapsed = (habit) => {
  if (!habit.gracePeriodStart) return false;

  const gracePeriodEnd = new Date(habit.gracePeriodStart);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14);

  return new Date() >= gracePeriodEnd;
};

module.exports = {
  TIER_THRESHOLDS,
  assignTier,
  evaluateHabit,
  evaluateAllHabitsForUser,
  hasGracePeriodElapsed,
};