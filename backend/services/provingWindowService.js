const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateConsistencyScore } = require('./consistencyService');
const { activateEntry } = require('./enrollmentService');

// the consistency score a habit must hit during its proving window
// to trigger the activation suggestion for the next habit in the queue
const UNLOCK_THRESHOLD = 0.80;

// checks whether a habit has hit the unlock threshold since its proving window started
// returns a progress snapshot object — does not mutate anything
const checkProvingWindowProgress = async (entryId) => {
  const entry = await prisma.stackingScheduleEntry.findUnique({
    where: { id: entryId },
    include: { habit: true },
  });

  if (entry.status !== 'ACTIVE') return null;

  const now   = new Date();
  const score = await calculateConsistencyScore(
    entry.habitId,
    entry.provingWindowStart,
    now
  );

  const windowPassed = now > new Date(entry.provingWindowTarget);

  return {
    entryId,
    habitId:            entry.habitId,
    habitName:          entry.habit.name,
    currentScore:       score,
    targetScore:        UNLOCK_THRESHOLD,
    provingWindowStart: entry.provingWindowStart,
    provingWindowTarget: entry.provingWindowTarget,
    daysRemaining:      Math.max(
      0,
      Math.round((new Date(entry.provingWindowTarget) - now) / (1000 * 60 * 60 * 24))
    ),
    thresholdMet: score >= UNLOCK_THRESHOLD,
    windowPassed,
  };
};

// marks an entry as COMPLETED and returns the next pending entry in the queue
// if no next entry exists, the enrollment itself is completed
// note: this does NOT activate the next entry — activation is triggered separately
// by the user accepting the suggestion via activateNextHabit
const completeEntry = async (entryId, isManualUnlock = false) => {
  // fetch first so we have enrollmentId before the update
  const entry = await prisma.stackingScheduleEntry.findUnique({
    where: { id: entryId },
  });

  await prisma.stackingScheduleEntry.update({
    where: { id: entryId },
    data: {
      status:      'COMPLETED',
      completedAt: new Date(),
    },
  });

  const nextEntry = await prisma.stackingScheduleEntry.findFirst({
    where: {
      enrollmentId: entry.enrollmentId,
      status:       'PENDING',
    },
    orderBy: { priorityRank: 'asc' },
  });

  if (!nextEntry) {
    await completeEnrollment(entry.enrollmentId);
    return { scheduleComplete: true };
  }

  return {
    scheduleComplete: false,
    nextEntryId:      nextEntry.id,
    nextHabitId:      nextEntry.habitId,
    isManualUnlock,
  };
};

// handles the user accepting the activation suggestion for the next habit in the queue
const activateNextHabit = async (entryId) => {
  await activateEntry(entryId);
};

// handles the user snoozing the activation suggestion
// resurfaces the suggestion 5 days later and increments the snooze counter
const snoozeActivation = async (entryId) => {
  const entry = await prisma.stackingScheduleEntry.findUnique({
    where: { id: entryId },
  });

  await prisma.stackingScheduleEntry.update({
    where: { id: entryId },
    data: {
      lastSnoozeAt: new Date(),
      snoozeCount:  entry.snoozeCount + 1,
    },
  });

  const resurfaceAt = new Date();
  resurfaceAt.setDate(resurfaceAt.getDate() + 5);

  return { resurfaceAt };
};

// marks the entire enrollment as COMPLETED once all entries have cleared
const completeEnrollment = async (enrollmentId) => {
  await prisma.stackingEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status:    'COMPLETED',
      updatedAt: new Date(),
    },
  });
};

// runs the proving window check for all active entries in a user's enrollment
// automatically completes entries that have hit the unlock threshold —
// the frontend is then responsible for prompting the user to accept or snooze
// activation of the next habit
const runProvingWindowCheckForUser = async (userId) => {
  const enrollment = await prisma.stackingEnrollment.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: {
      entries: {
        where: { status: 'ACTIVE' },
      },
    },
  });

  if (!enrollment) return null;

  const progressResults = await Promise.all(
    enrollment.entries.map((entry) => checkProvingWindowProgress(entry.id))
  );

  const readyToUnlock  = progressResults.filter((r) => r?.thresholdMet);
  const stillInProgress = progressResults.filter((r) => r && !r.thresholdMet);

  const unlockResults = await Promise.all(
    readyToUnlock.map((r) => completeEntry(r.entryId))
  );

  return {
    readyToUnlock,
    stillInProgress,
    unlockResults,
  };
};

module.exports = {
  UNLOCK_THRESHOLD,
  checkProvingWindowProgress,
  completeEntry,
  activateNextHabit,
  snoozeActivation,
  completeEnrollment,
  runProvingWindowCheckForUser,
};