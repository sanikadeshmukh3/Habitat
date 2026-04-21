const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { runOnCheckIn } = require('./activationService');

// Helper to format a Date as a local "YYYY-MM-DD" string (avoids UTC shift)
function toLocalDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeToStartOfDay(dateInput) {
  const dt = dateInput ? new Date(dateInput) : new Date();
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
}

// Recalculates currentStreak by walking backwards from today
// through consecutive completed check-ins and updates the habit row
async function recalculateStreak(habitId) {
  const checkIns = await prisma.habitCheckIn.findMany({
    where: { habitId, completed: true },
    orderBy: { date: 'desc' },
  });

  // Use local date strings to avoid UTC midnight shifting dates
  const completedDates = new Set(
    checkIns.map((c) => toLocalDateKey(new Date(c.date)))
  );

  // Walk backwards from today counting consecutive completed days
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = toLocalDateKey(cursor);
    if (completedDates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  await prisma.habit.update({
    where: { id: habitId },
    data: { currentStreak: streak },
  });

  return streak;
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

  // for weekly habits, block a second check-in within the same Mon–Sun week
  if (habit.frequency === 'WEEKLY') {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToMonday, 0, 0, 0, 0);
    const weekEnd   = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const existingThisWeek = await prisma.habitCheckIn.findFirst({
      where: {
        habitId,
        completed: true,
        date: { gte: weekStart, lt: weekEnd },
      },
    });

    if (existingThisWeek) {
      throw { status: 409, message: 'This habit has already been completed this week' };
    }
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

  let checkIn;
  if (existing) {
    checkIn = await prisma.habitCheckIn.update({
      where: { id: existing.id },
      data: {
        completed: Boolean(completed),
        difficultyRating: difficultyRating == null ? null : Number(difficultyRating),
        notes: notes === '' ? null : notes,
        date: start,
      },
    });
  } else {
    checkIn = await prisma.habitCheckIn.create({
      data: {
        habitId,
        date: start,
        completed: Boolean(completed),
        difficultyRating: difficultyRating == null ? null : Number(difficultyRating),
        notes: notes === '' ? null : notes,
      },
    });
  }

  // Recalculate streak, then run the stacking monitoring pipeline
  await recalculateStreak(habitId);
  await runOnCheckIn(habit.userId, habitId);

  return checkIn;
}

async function getCheckInsForMonth(userId, year, month) {
  const parsedYear  = Number(year);
  const parsedMonth = Number(month);

  if (Number.isNaN(parsedYear) || Number.isNaN(parsedMonth)) {
    throw { status: 400, message: 'year and month query params required' };
  }

  const habits = await prisma.habit.findMany({
    where: { userId },
    select: { id: true },
  });

  const habitIds = habits.map((h) => h.id);

  const start     = new Date(parsedYear, parsedMonth, 1, 0, 0, 0, 0);
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
    const d  = new Date(c.date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${c.habitId}-${d.getFullYear()}-${mm}-${dd}`;
    result[key] = {
      completed:        Boolean(c.completed),
      difficultyRating: c.difficultyRating,
      notes:            c.notes,
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