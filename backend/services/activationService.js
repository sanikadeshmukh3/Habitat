const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { completeEntry, activateNextHabit, snoozeActivation } = require('./provingWindowService');
const { runMonitoringForUser } = require('./stackingTriggerService');
const { runProvingWindowCheckForUser } = require('./provingWindowService');
const { updateConsistencyScore } = require('./consistencyService');
const { evaluateHabit } = require('./tierService');

// the number of days before a snoozed activation suggestion resurfaces
const SNOOZE_WINDOW_DAYS = 5;

// master function called every time the app opens for a user
// if the user is in an active stacking schedule, monitoring is suspended —
// the schedule itself is the intervention, so only the proving window is checked
// if no active schedule exists, the full monitoring pipeline runs as normal
const runOnAppOpen = async (userId) => {
  const activeEnrollment = await prisma.stackingEnrollment.findFirst({
    where: { userId, status: 'ACTIVE' },
  });

  if (activeEnrollment) {
    const provingWindowResults = await runProvingWindowCheckForUser(userId);
    return { provingWindowResults };
  }

  const monitoringResults     = await runMonitoringForUser(userId);
  const provingWindowResults  = await runProvingWindowCheckForUser(userId);

  return {
    preliminaryCheckHabits: monitoringResults.preliminaryCheckHabits,
    nudgeHabits:            monitoringResults.nudgeHabits,
    triggerStacking:        monitoringResults.triggerStacking,
    triggeringHabitNames:   monitoringResults.triggeringHabitNames,
    provingWindowResults,
  };
};

// called every time a user logs a check-in for a habit
// updates the consistency score and re-evaluates the habit's tier,
// then checks whether any active proving windows have hit the unlock threshold
const runOnCheckIn = async (userId, habitId) => {
  await updateConsistencyScore(habitId);
  await evaluateHabit(habitId);

  const provingWindowResults = await runProvingWindowCheckForUser(userId);
  return { provingWindowResults };
};

// handles the user accepting an activation suggestion for the next habit in the queue
const acceptActivation = async (entryId) => {
  await activateNextHabit(entryId);
};

// handles the user snoozing an activation suggestion
const snoozeActivationSuggestion = async (entryId) => {
  const { resurfaceAt } = await snoozeActivation(entryId);
  return { resurfaceAt };
};

// handles a user manually unlocking a dormant habit early
// completes the currently active entry, promotes the target habit to the front
// of the pending queue if necessary, then activates it immediately
const manuallyUnlockHabit = async (enrollmentId, targetHabitId) => {
  const activeEntry = await prisma.stackingScheduleEntry.findFirst({
    where: { enrollmentId, status: 'ACTIVE' },
  });

  const targetEntry = await prisma.stackingScheduleEntry.findFirst({
    where: { enrollmentId, habitId: targetHabitId, status: 'PENDING' },
  });

  if (!activeEntry || !targetEntry) return null;

  await completeEntry(activeEntry.id, true);

  // if the target isn't already next in line, swap its rank with the
  // current next-pending entry so it becomes the head of the queue
  const nextPendingEntry = await prisma.stackingScheduleEntry.findFirst({
    where: { enrollmentId, status: 'PENDING' },
    orderBy: { priorityRank: 'asc' },
  });

  if (nextPendingEntry && nextPendingEntry.id !== targetEntry.id) {
    const targetRank = targetEntry.priorityRank;
    const nextRank   = nextPendingEntry.priorityRank;

    await prisma.stackingScheduleEntry.update({
      where: { id: targetEntry.id },
      data:  { priorityRank: nextRank },
    });
    await prisma.stackingScheduleEntry.update({
      where: { id: nextPendingEntry.id },
      data:  { priorityRank: targetRank },
    });
  }

  await activateNextHabit(targetEntry.id);

  return { manualUnlockSuccess: true, activatedHabitId: targetHabitId };
};

// returns true if a snoozed activation suggestion is ready to resurface
const shouldResurfaceActivation = (entry) => {
  if (!entry.lastSnoozeAt) return false;

  const resurfaceAt = new Date(entry.lastSnoozeAt);
  resurfaceAt.setDate(resurfaceAt.getDate() + SNOOZE_WINDOW_DAYS);

  return new Date() >= resurfaceAt;
};

module.exports = {
  SNOOZE_WINDOW_DAYS,
  runOnAppOpen,
  runOnCheckIn,
  acceptActivation,
  snoozeActivationSuggestion,
  manuallyUnlockHabit,
  shouldResurfaceActivation,
};