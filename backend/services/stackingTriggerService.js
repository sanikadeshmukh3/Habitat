const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { evaluateAllHabitsForUser, hasGracePeriodElapsed } = require('./tierService');
const { shouldSendPreliminaryCheckIn } = require('./consistencyService');

// the number of days a tier 2 habit gets after the initial gentle nudge
// before the algorithm escalates to a habit-stacking enrollment recommendation
const TIER_2_ESCALATION_WINDOW_DAYS = 14;

// the minimum improvement in consistency required during the escalation window
// to avoid escalation — if the user hasn't improved by at least 5%, we escalate
const TIER_2_IMPROVEMENT_THRESHOLD = 0.05;

// returns true if this habit should receive its first gentle nudge
// only fires once — once gentleNudgeSentAt is set, this returns false
const shouldSendGentleNudge = (habit) => {
  return habit.tier === 'TIER_2' && !habit.gentleNudgeSentAt;
};

// returns true if a tier 2 habit's escalation window has passed
// without enough improvement after the initial nudge
const shouldEscalateNudge = (habit) => {
  if (!habit.gentleNudgeSentAt) return false;

  const escalationDeadline = new Date(habit.gentleNudgeSentAt);
  escalationDeadline.setDate(escalationDeadline.getDate() + TIER_2_ESCALATION_WINDOW_DAYS);

  if (new Date() < escalationDeadline) return false;

  const improvement = habit.consistencyScore - habit.nudgeConsistencyScore;

  return improvement <= TIER_2_IMPROVEMENT_THRESHOLD;
};

// determines whether a habit-stacking enrollment recommendation should be triggered for a user
// returns false immediately if there is already an active enrollment —
// only one enrollment can be active at a time
const shouldTriggerStacking = async (userId) => {
  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
  });

  // need more than one habit before stacking makes sense
  if (habits.length <= 1) return false;

  // an active enrollment already exists — don't trigger another
  const activeEnrollment = await prisma.stackingEnrollment.findFirst({
    where: { userId, status: 'ACTIVE' },
  });

  if (activeEnrollment) return false;

  // any tier 3 habit is an immediate trigger
  const hasTier3 = habits.some((h) => h.tier === 'TIER_3');
  if (hasTier3) return true;

  // a previously mastered habit whose grace period has now elapsed is a trigger
  const hasElapsedGracePeriod = habits.some(
    (h) => h.tier !== 'TIER_1' && h.gracePeriodStart && hasGracePeriodElapsed(h)
  );
  if (hasElapsedGracePeriod) return true;

  // a tier 2 habit that has been nudged but hasn't improved enough is a trigger
  const hasEscalatedTier2 = habits.some((h) => shouldEscalateNudge(h));
  if (hasEscalatedTier2) return true;

  return false;
};

// generates the pre-populated suggested ranking for the habit ranking screen
// tier 1 habits are excluded — they are locked at the top and not ranked by the user
// within tier 2 and tier 3, habits are sorted by descending consistency score
// (higher consistency = higher suggested priority)
const generateSuggestedRanking = async (userId) => {
  const habits = await prisma.habit.findMany({
    where: {
      userId,
      active: true,
      tier: { not: 'TIER_1' },
    },
  });

  const tier2 = habits
    .filter((h) => h.tier === 'TIER_2')
    .sort((a, b) => b.consistencyScore - a.consistencyScore);

  const tier3 = habits
    .filter((h) => h.tier === 'TIER_3')
    .sort((a, b) => b.consistencyScore - a.consistencyScore);

  return [...tier2, ...tier3].map((habit, index) => ({
    habitId:          habit.id,
    habitName:        habit.name,
    tier:             habit.tier,
    consistencyScore: habit.consistencyScore,
    frequency:        habit.frequency,
    suggestedRank:    index + 1,
  }));
};

// runs the full monitoring pipeline for a user:
// 1. evaluates all habits for tier assignment
// 2. identifies habits needing a preliminary halfway-point check
// 3. identifies tier 2 habits needing a gentle nudge
// 4. checks whether stacking enrollment should be triggered
const runMonitoringForUser = async (userId) => {
  await evaluateAllHabitsForUser(userId);

  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
  });

  // preliminary check: habits still in observation window that have crossed
  // the halfway point with consistency below the threshold
  const preliminaryCheckHabits = (
    await Promise.all(
      habits
        .filter((h) => !h.tier) // only habits not yet assigned a tier
        .map(async (h) => {
          const needs = await shouldSendPreliminaryCheckIn(h.id);
          return needs ? h : null;
        })
    )
  ).filter(Boolean);

  const nudgeHabits = habits.filter((h) => shouldSendGentleNudge(h));

  const triggerStacking = await shouldTriggerStacking(userId);

  // habits that are directly causing a stacking trigger
  const triggeringHabits = habits.filter(
    (h) => h.tier === 'TIER_3' || shouldEscalateNudge(h)
  );

  return {
    preliminaryCheckHabits,
    nudgeHabits,
    triggerStacking,
    triggeringHabitNames: triggeringHabits.map((h) => h.name),
  };
};

module.exports = {
  shouldSendGentleNudge,
  shouldEscalateNudge,
  shouldTriggerStacking,
  generateSuggestedRanking,
  runMonitoringForUser,
};