const { PrismaClient, HabitCategory, HabitFrequency } = require('@prisma/client');

const prisma = new PrismaClient();

const VALID_CATEGORIES = ['FITNESS', 'NUTRITION', 'SLEEP', 'PRODUCTIVITY', 'WELLNESS', 'OTHER'];
const VALID_FREQUENCIES = ['DAILY', 'WEEKLY'];

function isValidCategory(v) {
  return typeof v === 'string' && VALID_CATEGORIES.includes(v);
}

function isValidFrequency(v) {
  return typeof v === 'string' && VALID_FREQUENCIES.includes(v);
}

// Helper to format a Date as a local "YYYY-MM-DD" string (avoids UTC shift)
function toLocalDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getHabits(req, res, next) {
  try {
    const userId = req.user.userId;

    const habits = await prisma.habit.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: habits });
  } catch (err) {
    next(err);
  }
}

async function getHabitById(req, res, next) {
  try {
    const { id } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toLocalDateKey(today);

    // Calculate the Sunday that opens the 5-week window
    const gridStart = new Date(today);
    gridStart.setDate(today.getDate() - 34 - today.getDay());
    gridStart.setHours(0, 0, 0, 0);

    const habit = await prisma.habit.findUnique({
      where:   { id },
      include: {
        checkIns: {
          where: {
            date: { gte: gridStart },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!habit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    // Build Set of local date strings for O(1) lookup — use local dates to
    // avoid UTC midnight shifting the date by one day
    const checkinDates = new Set(
      habit.checkIns.map((c) => toLocalDateKey(new Date(c.date)))
    );

    // Habit creation date (local, time stripped)
    const createdDate = new Date(habit.createdAt);
    createdDate.setHours(0, 0, 0, 0);

    // Build the 35-day completion grid
    const completionGrid = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() - d.getDay() - 28);
      const key = toLocalDateKey(d);

      if (d > today) {
        completionGrid.push(null);   // future — no data yet
      } else if (d < createdDate) {
        completionGrid.push(null);   // before habit was created
      } else {
        completionGrid.push(checkinDates.has(key));
      }
    }

    // Total completions across all time
    const totalCompletions = await prisma.habitCheckIn.count({
      where: { habitId: id, completed: true },
    });

    // Best streak from the grid (past + present cells only)
    const gridBools = completionGrid.filter((v) => v !== null);
    let bestStreak = 0;
    let runningStreak = 0;
    for (const completed of gridBools) {
      if (completed) {
        runningStreak++;
        if (runningStreak > bestStreak) bestStreak = runningStreak;
      } else {
        runningStreak = 0;
      }
    }

    // Total days tracked = days since creation, inclusive
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const totalDays = Math.floor((todayDate - createdDate) / (1000 * 60 * 60 * 24)) + 1;

    const stats = {
      habitId:          habit.id,
      currentStreak:    habit.currentStreak,
      bestStreak,
      totalCompletions,
      totalDays,
      completionGrid,
    };

    const { checkIns, ...habitData } = habit;
    res.json({ data: { ...habitData, stats } });
  } catch (err) {
    next(err);
  }
}

async function createHabit(req, res, next) {
  console.log('Create Habit - Request received');
  try {
    const userId = req.user.userId;
    console.log('BODY:', req.body);
    console.log('USER ID:', userId);

    const body = req.body;

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      res.status(400).json({ error: '`name` is required' });
      return;
    }
    if (!isValidCategory(body.habitCategory)) {
      res.status(400).json({ error: `\`habitCategory\` must be one of: ${VALID_CATEGORIES.join(', ')}` });
      return;
    }
    if (!isValidFrequency(body.frequency)) {
      res.status(400).json({ error: `\`frequency\` must be one of: ${VALID_FREQUENCIES.join(', ')}` });
      return;
    }

    const duplicate = await prisma.habit.findFirst({
      where: {
        userId,
        name: { equals: body.name.trim(), mode: 'insensitive' },
      },
    });
    if (duplicate) {
      res.status(409).json({ error: 'You already have a habit with that name' });
      return;
    }

    // habit stacking — calculate the observation window end date based on frequency
    // DAILY: 30 days, WEEKLY: 56 days (8 weeks)
    const observationWindowDays = {
      DAILY:   30,
      WEEKLY:  56,
    };

    const windowDays = observationWindowDays[body.frequency] ?? 30;
    const observationWindowEnd = new Date();
    observationWindowEnd.setDate(observationWindowEnd.getDate() + windowDays);

    const habit = await prisma.habit.create({
      data: {
        userId,
        name:          body.name.trim(),
        ...(body.description?.trim() && { description: body.description.trim() }),
        habitCategory: body.habitCategory,
        frequency:     body.frequency,
        visibility:    body.visibility  ?? true,
        active:        body.active      ?? true,
        updatedAt:     new Date(),
        observationWindowEnd,
        ...(body.priorityRank != null && { priorityRank: Number(body.priorityRank) }),
      },
    });

    res.status(201).json({ data: habit });
  } catch (err) {
    next(err);
  }
}

async function updateHabit(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id }  = req.params;

    const existing = await prisma.habit.findUnique({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const body = req.body;
    const data = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({ error: '`name` cannot be empty' });
        return;
      }
      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      data.description = body.description.trim() === '' ? null : body.description.trim();
    }

    if (body.habitCategory !== undefined) {
      if (!isValidCategory(body.habitCategory)) {
        res.status(400).json({ error: `\`habitCategory\` must be one of: ${VALID_CATEGORIES.join(', ')}` });
        return;
      }
      data.habitCategory = body.habitCategory;
    }

    if (body.frequency !== undefined) {
      if (!isValidFrequency(body.frequency)) {
        res.status(400).json({ error: `\`frequency\` must be one of: ${VALID_FREQUENCIES.join(', ')}` });
        return;
      }
      data.frequency = body.frequency;
    }

    if (body.visibility  !== undefined) data.visibility   = Boolean(body.visibility);
    if (body.active      !== undefined) data.active       = Boolean(body.active);
    if (body.priorityRank !== undefined) {
      data.priorityRank = body.priorityRank === null ? null : Number(body.priorityRank);
    }
    data.updatedAt = new Date();

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields provided to update' });
      return;
    }

    const habit = await prisma.habit.update({
      where: { id, userId },
      data,
    });

    res.json({ data: habit });
  } catch (err) {
    next(err);
  }
}

async function deleteHabit(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const existing = await prisma.habit.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Delete check-ins first to satisfy the foreign key constraint
    await prisma.habitCheckIn.deleteMany({ where: { habitId: id } });

    // habit stacking — delete any schedule entries for this habit before
    // deleting the habit itself to satisfy the foreign key constraint on
    // StackingScheduleEntry.habitId
    await prisma.stackingScheduleEntry.deleteMany({ where: { habitId: id } });
    
    await prisma.habit.delete({ where: { id } });

    res.json({ data: { id } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHabits, getHabitById, createHabit, updateHabit, deleteHabit };