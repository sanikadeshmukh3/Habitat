const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { PROVING_WINDOW_DAYS } = require('./consistencyService');

// enrolls a user in a habit-stacking schedule given an ordered list of habit IDs
// rankedHabitIds contains only tier 2 and tier 3 habits — tier 1 habits are
// locked at the top of the ranking screen and excluded from the schedule entirely
const enrollUserInStacking = async (userId, rankedHabitIds) => {
  const habits = await prisma.habit.findMany({
    where: { id: { in: rankedHabitIds } },
  });

  const habitMap = Object.fromEntries(habits.map((h) => [h.id, h]));

  const enrollment = await prisma.stackingEnrollment.create({
    data: {
      userId,
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });

  let firstActiveEntryId = null;

  for (let i = 0; i < rankedHabitIds.length; i++) {
    const habitId = rankedHabitIds[i];
    const isFirst = i === 0;

    const entry = await prisma.stackingScheduleEntry.create({
      data: {
        enrollmentId: enrollment.id,
        habitId,
        priorityRank: i + 1,
        status: 'PENDING',
      },
    });

    if (isFirst) {
      firstActiveEntryId = entry.id;
    } else {
      // deactivate all habits except the first — they will be reactivated
      // one by one as each proving window is passed
      await prisma.habit.update({
        where: { id: habitId },
        data: { active: false, updatedAt: new Date() },
      });
    }
  }

  if (firstActiveEntryId) {
    await activateEntry(firstActiveEntryId);
  }

  return enrollment;
};

// activates a specific schedule entry:
// 1. marks the entry as ACTIVE
// 2. sets the proving window start and target dates based on the habit's tier AND frequency
// 3. reactivates the habit on the dashboard
// NOTE: manual early unlocking bypasses the proving window target —
// when implementing manual unlock, call activateEntry on the next entry directly
const activateEntry = async (entryId) => {
  const entry = await prisma.stackingScheduleEntry.findUnique({
    where: { id: entryId },
    include: { habit: true },
  });

  const provingWindowStart = new Date();
  const provingWindowDays  = PROVING_WINDOW_DAYS[entry.habit.tier][entry.habit.frequency];

  const provingWindowTarget = new Date();
  provingWindowTarget.setDate(provingWindowTarget.getDate() + provingWindowDays);

  await prisma.stackingScheduleEntry.update({
    where: { id: entryId },
    data: {
      status:              'ACTIVE',
      provingWindowStart,
      provingWindowTarget,
      activatedAt:         new Date(),
    },
  });

  await prisma.habit.update({
    where: { id: entry.habitId },
    data: { active: true, updatedAt: new Date() },
  });

  return entry;
};

// handles a user opting out of their active stacking schedule:
// marks the enrollment as OPTED_OUT and reactivates all habits
// that were deactivated as part of the schedule (status PENDING)
const optOutOfStacking = async (enrollmentId) => {
  await prisma.stackingEnrollment.update({
    where: { id: enrollmentId },
    data: { status: 'OPTED_OUT', updatedAt: new Date() },
  });

  const pendingEntries = await prisma.stackingScheduleEntry.findMany({
    where: { enrollmentId, status: 'PENDING' },
  });

  await Promise.all(
    pendingEntries.map((entry) =>
      prisma.habit.update({
        where: { id: entry.habitId },
        data: { active: true, updatedAt: new Date() },
      })
    )
  );
};

// handles a new habit being added while the user already has an active stacking schedule
// appends the habit as a PENDING entry at the end of the queue and deactivates it
const addHabitToActiveSchedule = async (userId, habitId) => {
  const enrollment = await prisma.stackingEnrollment.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { entries: true },
  });

  if (!enrollment) return null;

  // guard against empty entries array — should never happen in practice
  // but Math.max(...[]) returns -Infinity without this
  const maxRank = enrollment.entries.length > 0
    ? Math.max(...enrollment.entries.map((e) => e.priorityRank))
    : 0;

  const newEntry = await prisma.stackingScheduleEntry.create({
    data: {
      enrollmentId: enrollment.id,
      habitId,
      priorityRank: maxRank + 1,
      status:       'PENDING',
    },
  });

  await prisma.habit.update({
    where: { id: habitId },
    data: { active: false, updatedAt: new Date() },
  });

  return { enrollmentId: enrollment.id, newEntryId: newEntry.id };
};

// re-ranks all pending entries in a schedule based on a new ordering from the user
// the currently active entry is never touched — only PENDING entries are re-ranked
const reorderPendingEntries = async (enrollmentId, reorderedHabitIds) => {
  await Promise.all(
    reorderedHabitIds.map((habitId, index) =>
      prisma.stackingScheduleEntry.updateMany({
        where: { enrollmentId, habitId, status: 'PENDING' },
        data:  { priorityRank: index + 1 },
      })
    )
  );
};

module.exports = {
  enrollUserInStacking,
  activateEntry,
  optOutOfStacking,
  addHabitToActiveSchedule,
  reorderPendingEntries,
};