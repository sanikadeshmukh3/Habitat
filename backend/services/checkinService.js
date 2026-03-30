const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeToStartOfDay(dateInput) {
  const dt = dateInput ? new Date(dateInput) : new Date();
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
}

async function upsertHabitCheckIn(userId, habitId, data) {
  const {
    date,
    completed = true,
    difficultyRating = null,
    notes = '',
  } = data;

  if (!habitId || !date) {
    throw { status: 400, message: 'habitId and date are required' };
  }

  if (
    difficultyRating != null &&
    (Number(difficultyRating) < 1 || Number(difficultyRating) > 3)
  ) {
    throw { status: 400, message: 'difficultyRating must be between 1 and 3' };
  }

  if (notes && notes.length > 500) {
    throw { status: 400, message: 'notes must be 500 characters or less' };
  }

  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit) {
    throw { status: 404, message: 'Habit not found' };
  }

  if (habit.userId !== userId) {
    throw { status: 403, message: 'Forbidden' };
  }

  if (!habit.active) {
    throw { status: 400, message: 'Cannot check in an inactive habit' };
  }

  const start = normalizeToStartOfDay(date);
  const nextDay = new Date(start);
  nextDay.setDate(nextDay.getDate() + 1);

  const existing = await prisma.habitCheckIn.findFirst({
    where: {
      habitId,
      date: {
        gte: start,
        lt: nextDay,
      },
    },
  });

  if (existing) {
    return prisma.habitCheckIn.update({
      where: { id: existing.id },
      data: {
        completed: Boolean(completed),
        difficultyRating: difficultyRating == null ? null : Number(difficultyRating),
        notes: notes === '' ? null : notes,
        date: start,
      },
    });
  }

  return prisma.habitCheckIn.create({
    data: {
      habitId,
      date: start,
      completed: Boolean(completed),
      difficultyRating: difficultyRating == null ? null : Number(difficultyRating),
      notes: notes === '' ? null : notes,
    },
  });
}

async function getCheckInsForMonth(userId, year, month) {
  const parsedYear = Number(year);
  const parsedMonth = Number(month);

  if (Number.isNaN(parsedYear) || Number.isNaN(parsedMonth)) {
    throw { status: 400, message: 'year and month query params required' };
  }

  const habits = await prisma.habit.findMany({
    where: { userId },
    select: { id: true },
  });

  const habitIds = habits.map((h) => h.id);

  const start = new Date(parsedYear, parsedMonth, 1, 0, 0, 0, 0);
  const nextMonth = new Date(parsedYear, parsedMonth + 1, 1, 0, 0, 0, 0);

  const checkins = await prisma.habitCheckIn.findMany({
    where: {
      habitId: { in: habitIds },
      date: {
        gte: start,
        lt: nextMonth,
      },
    },
  });

  const result = {};
  for (const c of checkins) {
    const d = new Date(c.date);
    const key = `${c.habitId}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    result[key] = {
      completed: Boolean(c.completed),
      difficultyRating: c.difficultyRating,
      notes: c.notes,
    };
  }

  return result;
}

async function getHabitCheckIns(userId, habitId) {
  if (!habitId) {
    throw { status: 400, message: 'habitId is required' };
  }

  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit) {
    throw { status: 404, message: 'Habit not found' };
  }

  if (habit.userId !== userId) {
    throw { status: 403, message: 'Forbidden' };
  }

  return prisma.habitCheckIn.findMany({
    where: { habitId },
    orderBy: { date: 'desc' },
  });
}

module.exports = {
  upsertHabitCheckIn,
  getCheckInsForMonth,
  getHabitCheckIns,
};