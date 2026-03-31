const { PrismaClient, HabitCategory, HabitFrequency } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── Validation helpers ───────────────────────────────────────────────────────
// Prisma will reject invalid enum values at runtime, but validating early lets
// us return a clear 400 instead of a generic 500.

const VALID_CATEGORIES = ['FITNESS', 'NUTRITION', 'SLEEP', 'PRODUCTIVITY', 'WELLNESS', 'OTHER'];
const VALID_FREQUENCIES = ['DAILY', 'WEEKLY'];

function isValidCategory(v) {
  return typeof v === 'string' && VALID_CATEGORIES.includes(v);
}

function isValidFrequency(v) {
  return typeof v === 'string' && VALID_FREQUENCIES.includes(v);
}

// ─── Controller functions ─────────────────────────────────────────────────────

/**
 * GET /habits
 * Returns every habit that belongs to the authenticated user, newest first.
 */
async function getHabits(req, res, next) {
  try {
    // TODO: replace with your auth middleware value once auth is wired up
    const userId = req.user?.id ?? req.query.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const habits = await prisma.habit.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: habits });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /habits/:id
 * Returns a single habit plus its aggregated stats (streak, completion grid).
 */
async function getHabitById(req, res, next) {
  try {
    const { id } = req.params;

    // 1. Fetch the habit — include its checkIns for the last 35 days in one query
    const habit = await prisma.habit.findUnique({
      where:   { id },
      include: {
        checkIns: {
          where: {
            date: {
              // Pull check-ins from the Sunday that opened this 5-week window
              gte: (() => {
                const d = new Date();
                d.setDate(d.getDate() - 34 - d.getDay()); // rewind to Sunday
                d.setHours(0, 0, 0, 0);
                return d;
              })(),
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!habit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    // 2. Build the 35-day completion grid (5 full weeks, columns = S M T W T F S)
    //    Convert the checkIn list into a Set of "YYYY-MM-DD" strings for O(1) lookup.
    const checkinDates = new Set(
      habit.checkIns.map((c) => c.date.toISOString().slice(0, 10)),
    );

    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const gridStart = new Date(today);
    gridStart.setDate(today.getDate() - 34 - today.getDay()); // rewind to Sunday
    gridStart.setHours(0, 0, 0, 0);

    const completionGrid = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      if (key > todayKey) {
        completionGrid.push(null);  // future — no data yet
      } else {
        completionGrid.push(checkinDates.has(key));
      }
    }

    // 3. Count total check-ins across all time (not just the grid window)
    const totalCompletions = await prisma.habitCheckIn.count({
      where: { habitId: id },
    });

    // 4. Compute stats
    //    currentStreak is stored on the habit row itself — no need to recalculate.
    //    bestStreak is derived from the grid booleans (past/present cells only).
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

    // Total days tracked = days since the habit was created, inclusive
    const createdDate = new Date(habit.createdAt);
    createdDate.setHours(0, 0, 0, 0);
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

    // Strip checkIns off the habit before sending — the client gets the grid instead
    const { checkIns, ...habitData } = habit;
    res.json({ data: { ...habitData, stats } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /habits
 * Creates a new habit row owned by the authenticated user.
 */
async function createHabit(req, res, next) {
  console.log('Create Habit - Request received');
  try {
    const userId = req.user?.id ?? req.query.userId;
    console.log('BODY:', req.body);
    console.log('USER ID:', userId);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

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

    const habit = await prisma.habit.create({
      data: {
        userId,
        name:          body.name.trim(),
        // Only include description if it was actually sent and is non-empty
        ...(body.description?.trim() && { description: body.description.trim() }),
        habitCategory: body.habitCategory,
        frequency:     body.frequency,
        visibility:    body.visibility  ?? true,  // default public
        active:        body.active      ?? true,  // default active
        updatedAt:    new Date(),
        // currentStreak defaults to 0 via the Prisma schema @default(0)
        ...(body.priorityRank != null && { priorityRank: Number(body.priorityRank) }),
      },
    });

    res.status(201).json({ data: habit });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /habits/:id
 * Partial update — only the fields present in the request body are changed.
 * Ownership is enforced by checking userId on the existing row.
 */
async function updateHabit(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id }  = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Confirm the habit exists and belongs to this user before updating
    const existing = await prisma.habit.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const body = req.body;

    // Build the update payload — only include keys that were actually sent
    const data = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({ error: '`name` cannot be empty' });
        return;
      }
      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      // Empty string clears the field; Prisma stores null for optional strings
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

    if (body.visibility !== undefined) data.visibility   = Boolean(body.visibility);
    if (body.active     !== undefined) data.active       = Boolean(body.active);
    if (body.priorityRank !== undefined) {
      // Allow null to clear the rank
      data.priorityRank = body.priorityRank === null ? null : Number(body.priorityRank);
    }
    data.updatedAt = new Date();

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields provided to update' });
      return;
    }

    // Prisma automatically sets updatedAt because of @updatedAt in the schema
    const habit = await prisma.habit.update({
      where: { id },
      data,
    });

    res.json({ data: habit });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHabits, getHabitById, createHabit, updateHabit };