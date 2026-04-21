const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// observation window lengths by frequency — how long before the first tier assessment
const OBSERVATION_WINDOW_DAYS = {
  DAILY:  30,
  WEEKLY: 56,   // 8 weeks
};

// halfway point of each observation window — when the preliminary welfare check fires
// if consistency is below PRELIMINARY_CHECK_THRESHOLD at this point, send a nudge
const PRELIMINARY_CHECK_DAYS = {
  DAILY:  15,
  WEEKLY: 28,   // 4 weeks
};

const PRELIMINARY_CHECK_THRESHOLD = 0.40;

// proving window lengths by tier and frequency
// these are the windows a habit must pass through after its observation window closes
const PROVING_WINDOW_DAYS = {
  TIER_2: {
    DAILY:  14,
    WEEKLY: 21,  // 3 weeks
  },
  TIER_3: {
    DAILY:  21,
    WEEKLY: 35,  // 5 weeks
  },
};

// returns true once the habit's full observation window has elapsed
// no tier assignments or stacking decisions should be made before this
const hasCompletedObservationPeriod = (habit) => {
  return new Date() >= new Date(habit.observationWindowEnd);
};

// calculates how many completions were expected between two dates for a given frequency
const getExpectedCompletions = (frequency, startDate, endDate) => {
  const days = Math.round(
    (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
  );

  switch (frequency) {
    case 'DAILY':  return days;
    case 'WEEKLY': return Math.floor(days / 7);
    default:       return days;
  }
};

// calculates a habit's consistency score over an explicit date range
// used for both the observation window assessment and proving window re-assessments
// returns a float 0.0–1.0
const calculateConsistencyScore = async (habitId, startDate, endDate) => {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) throw { status: 404, message: 'Habit not found' };

  const checkIns = await prisma.habitCheckIn.findMany({
    where: {
      habitId,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
  });

  const completedCount = checkIns.filter((c) => c.completed).length;
  const expectedCount  = getExpectedCompletions(habit.frequency, startDate, endDate);

  if (expectedCount === 0) return 0;

  return Math.min(completedCount / expectedCount, 1.0);
};

// calculates the score over the habit's fixed observation window (createdAt → observationWindowEnd)
// this is the score that drives the end-of-window tier assignment
const calculateObservationWindowScore = async (habitId) => {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) throw { status: 404, message: 'Habit not found' };

  return calculateConsistencyScore(habitId, habit.createdAt, habit.observationWindowEnd);
};

// recomputes the observation window score and persists it to the habit row
const updateConsistencyScore = async (habitId) => {
  const score = await calculateObservationWindowScore(habitId);

  await prisma.habit.update({
    where: { id: habitId },
    data: {
      consistencyScore:     score,
      consistencyUpdatedAt: new Date(),
    },
  });

  return score;
};

// returns true if this habit should receive a halfway-point welfare check nudge
// conditions: observation window not yet closed, halfway point passed,
// nudge not already sent, and current consistency is below the threshold
const shouldSendPreliminaryCheckIn = async (habitId) => {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) throw { status: 404, message: 'Habit not found' };

  // window already closed — too late for a nudge
  if (hasCompletedObservationPeriod(habit)) return false;

  // nudge already sent for this habit — don't send twice
  if (habit.gentleNudgeSentAt) return false;

  const now               = new Date();
  const createdAt         = new Date(habit.createdAt);
  const daysSinceCreation = Math.round((now - createdAt) / (1000 * 60 * 60 * 24));
  const preliminaryCheckDay = PRELIMINARY_CHECK_DAYS[habit.frequency];

  // haven't reached the halfway point yet
  if (daysSinceCreation < preliminaryCheckDay) return false;

  const score = await calculateConsistencyScore(habitId, createdAt, now);

  return score < PRELIMINARY_CHECK_THRESHOLD;
};

module.exports = {
  OBSERVATION_WINDOW_DAYS,
  PRELIMINARY_CHECK_DAYS,
  PRELIMINARY_CHECK_THRESHOLD,
  PROVING_WINDOW_DAYS,
  hasCompletedObservationPeriod,
  getExpectedCompletions,
  calculateConsistencyScore,
  calculateObservationWindowScore,
  updateConsistencyScore,
  shouldSendPreliminaryCheckIn,
};