const prisma = require('../lib/prisma');
const {
  computePointsEarned,
  computeDailyCheckIn,
  computeWeeklyCheckIn,
  evaluateDailyStreakHealth,
  evaluateWeeklyStreakHealth,
  recalculateDailyStreak,
  recalculateWeeklyStreak,
  diffDays,
} = require('../lib/streaks');
const { evaluateNewBadges, BADGE_DEFINITIONS } = require('../lib/badges');

const { runOnCheckIn } = require('./activationService');

// Helper to format a Date as a local "YYYY-MM-DD" string (avoids UTC shift)
function toLocalDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeToStartOfDay(dateInput) {
  const dt = dateInput ? new Date(dateInput) : new Date();
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
}

// returns the Monday and Sunday that start/end the week that contains 'date'
function getWeekBounds(d) {
  const dayOfWeek    = d.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart    = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToMonday, 0, 0, 0, 0);
  const weekEnd      = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7, 0, 0, 0, 0);
  return { weekStart, weekEnd };
}

// ─── Main upsert ──────────────────────────────────────────────────────────────

/**
 * Upserts a check-in then, if completed=true, orchestrates:
 *   1. Streak update (daily or weekly rules, with probation period for daily)
 *   2. Points award (1 + floor(log2(newStreak)))
 *   3. Badge evaluation and insert
 *
 * Only check-ins on or after `habit.createdAt` are counted towards streaks and
 * points. This prevents backdated check-ins from farming streaks or points
 * beyond what the habit's lifetime can legitimately produce.
 *
 * Returns the check-in row plus metadata the client can use for toasts/UI:
 *   { checkIn, pointsEarned, newStreak, streakBroke, newBadges, totalPoints }
 */
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

  const habit = await prisma.habit.findUnique({ where: { id: habitId } });

  if (!habit) {
    throw { status: 404, message: 'Habit not found' };
  }

  if (habit.userId !== userId) {
    throw { status: 403, message: 'Forbidden' };
  }

  if (!habit.active) {
    throw { status: 400, message: 'Cannot check in an inactive habit' };
  }

  // any check-in or feedback edit within the same Mon-Sun week always lands on the same existing record,
  // making duplicates physically impossible

  const checkInDate = normalizeToStartOfDay(date);
  const nextDay     = new Date(checkInDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // ── Wrap everything in a transaction so check-in + streak + points + badges are atomic ──
  const result = await prisma.$transaction(async (tx) => {

    // 1. Find any existing check-in for this day/week
    //    daily habits: look up by exact date.
    //    weekly habits: look up by the full Mon–Sun week so that feedback edits
    //      from any day of the week always find and update the original record,
    //      rather than attempting to create a duplicate
    let existing;
    if (habit.frequency === 'WEEKLY') {
      const { weekStart, weekEnd } = getWeekBounds(checkInDate);
      existing = await tx.habitCheckIn.findFirst({
        where: { habitId, date: { gte: weekStart, lt: weekEnd } },
        orderBy: { date: 'desc' }, // always pick the most recently modified record
      });
    } else {
      existing = await tx.habitCheckIn.findFirst({
        where: { habitId, date: { gte: checkInDate, lt: nextDay } },
      });
    }

    // ── UNCHECK PATH ──────────────────────────────────────────────────────────
    // When unchecking we need to:
    //   a) Deduct exactly the points that were awarded when this was checked in
    //      (stored on the row so there is no guesswork).
    //   b) Recalculate the streak from scratch because removing a check-in can
    //      collapse a streak differently from the incremental logic.
    //   c) Clear the probation period — a full recalculation is the source of truth.
    if (!Boolean(completed)) {
      const pointsToDeduct = existing?.pointsEarned ?? 0;

      // Mark the check-in as incomplete (or create a false one if it doesn't exist)
      let checkIn;
      if (existing) {
        checkIn = await tx.habitCheckIn.update({
          where: { id: existing.id },
          data: {
            completed:        false,
            pointsEarned:     0,
            difficultyRating: difficultyRating == null ? null : Number(difficultyRating),
            notes:            notes === '' ? null : notes,
          },
        });
      } else {
        checkIn = await tx.habitCheckIn.create({
          data: {
            habitId,
            date:             checkInDate,
            completed:        false,
            pointsEarned:     0,
            difficultyRating: difficultyRating == null ? null : Number(difficultyRating),
            notes:            notes === '' ? null : notes,
          },
        });
      }

      // All completed check-ins that remain after this uncheck, restricted to
      // dates on or after the habit's creation date so backdated entries cannot
      // contribute to the recalculated streak.
      const remaining = await tx.habitCheckIn.findMany({
        where: { habitId, completed: true, date: { gte: habit.createdAt } },
        orderBy: { date: 'desc' },
      });
      const remainingDates = remaining.map((c) => new Date(c.date));

      let newStreak = 0;
      if (habit.frequency === 'DAILY') {
        newStreak = recalculateDailyStreak(remainingDates, new Date()).streak;
      } else if (habit.frequency === 'WEEKLY') {
        newStreak = recalculateWeeklyStreak(remainingDates, new Date()).streak;
      }

      await tx.habit.update({
        where: { id: habitId },
        data: {
          currentStreak:              newStreak,
          streakProbationPeriodStart: null, // full recalc clears probation
        },
      });

      // Deduct points (floor at 0 — can't go negative)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: pointsToDeduct } },
        select: { points: true },
      });
      const totalPoints = Math.max(0, updatedUser.points);

      // If the DB went negative (race condition), clamp it
      if (updatedUser.points < 0) {
        await tx.user.update({
          where: { id: userId },
          data: { points: 0 },
        });
      }

      return {
        checkIn,
        pointsEarned:  pointsToDeduct > 0 ? -pointsToDeduct : 0,
        newStreak,
        streakBroke:   newStreak < habit.currentStreak,
        newBadges:     [],
        totalPoints,
      };
    }

    // ── COMPLETE PATH ─────────────────────────────────────────────────────────
    let checkIn;
    if (existing) {
      checkIn = await tx.habitCheckIn.update({
        where: { id: existing.id },
        data: {
          completed:        true,
          difficultyRating: difficultyRating == null ? null : Number(difficultyRating),
          notes:            notes === '' ? null : notes,
        },
      });
    } else {
      checkIn = await tx.habitCheckIn.create({
        data: {
          habitId,
          date:             checkInDate, // only set on create
          completed:        true,
          pointsEarned:     0, // updated below once we know the streak
          difficultyRating: difficultyRating == null ? null : Number(difficultyRating),
          notes:            notes === '' ? null : notes,
        },
      });
    }

    // 2. Compute new streak from prior completed check-ins, restricted to
    //    dates on or after the habit's creation date so backdated entries
    //    cannot contribute to the streak or earn points.
    let newStreak               = habit.currentStreak;
    let newProbationPeriodStart = habit.streakProbationPeriodStart;
    let streakBroke             = false;

    const priorCheckIns = await tx.habitCheckIn.findMany({
      where: { habitId, completed: true, date: { gte: habit.createdAt, lt: checkInDate } },
      orderBy: { date: 'desc' },
    });
    const priorDates    = priorCheckIns.map((c) => new Date(c.date));
    const lastCompleted = priorDates[0] ?? null;

    if (habit.frequency === 'DAILY') {
      const r = computeDailyCheckIn(
        habit.currentStreak,
        habit.streakProbationPeriodStart,
        lastCompleted,
        checkInDate,
      );
      newStreak               = r.newStreak;
      newProbationPeriodStart = r.newStreakProbationPeriodStart;
      streakBroke             = r.streakBroke;
    } else if (habit.frequency === 'WEEKLY') {
      const r = computeWeeklyCheckIn(habit.currentStreak, priorDates, checkInDate);
      newStreak               = r.newStreak;
      streakBroke             = r.streakBroke;
      newProbationPeriodStart = null;
    }

    const pointsEarned = computePointsEarned(newStreak);

    // Store pointsEarned on the check-in row so we can reverse it on uncheck
    await tx.habitCheckIn.update({
      where: { id: checkIn.id },
      data:  { pointsEarned },
    });

    // 3. Write streak back to Habit
    await tx.habit.update({
      where: { id: habitId },
      data: {
        currentStreak:              newStreak,
        streakProbationPeriodStart: newProbationPeriodStart,
      },
    });

    // 4. Award points to User
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { points: { increment: pointsEarned } },
      select: {
        points:   true,
        creation: true,
        badges:   { select: { badgeId: true } },
      },
    });

    // 5. Evaluate badges
    const allUserHabits = await tx.habit.findMany({
      where:  { userId, active: true },
      select: {
        id:               true,
        frequency:        true,
        currentStreak:    true,
        consistencyScore: true,
        createdAt:        true,
      },
    });

    const badgeContext = {
      accountAgeDays: diffDays(new Date(), new Date(updatedUser.creation)),
      totalPoints:    updatedUser.points,
      habits: allUserHabits.map((h) => ({
        id:               h.id,
        frequency:        h.frequency,
        currentStreak:    h.currentStreak,
        consistencyScore: h.consistencyScore,
        habitAgeDays:     diffDays(new Date(), new Date(h.createdAt)),
      })),
    };

    const alreadyEarned  = new Set(updatedUser.badges.map((b) => b.badgeId));
    const newBadgeIds    = evaluateNewBadges(badgeContext, alreadyEarned);

    if (newBadgeIds.length > 0) {
      await tx.userBadge.createMany({
        data:            newBadgeIds.map((badgeId) => ({ userId, badgeId })),
        skipDuplicates:  true,
      });
    }

    const newBadgeDetails = newBadgeIds.map((id) => {
      const def = BADGE_DEFINITIONS.find((b) => b.id === id);
      return { id: def.id, name: def.name, emoji: def.emoji, description: def.description };
    });
    
    return {
      checkIn,
      pointsEarned,
      newStreak,
      streakBroke,
      newBadges:   newBadgeDetails,
      totalPoints: updatedUser.points,
    };
  });

  return result;
}

// ─── Streak health at read time ───────────────────────────────────────────────

/**
 * Fetches a habit and lazily evaluates whether its streak has silently broken
 * or entered probation since the last check-in. Writes any state changes back
 * to the DB so the client always gets accurate data without a cron job.
 *
 * Call this from your GET /habits/:id handler and include `inProbationPeriod`
 * in the response — habit-detail.tsx uses it to show the ⏰ banner.
 *
 * @param {string} habitId
 * @returns {Promise<object>}  habit row + inProbationPeriod boolean
 */
async function getHabitWithStreakHealth(habitId) {
  const habit = await prisma.habit.findUniqueOrThrow({
    where:   { id: habitId },
    include: {
      checkIns: {
        where:   { completed: true },
        orderBy: { date: 'desc' },
        take:    1,
      },
    },
  });

  const lastCompleted = habit.checkIns[0]?.date ?? null;
  const today         = new Date();
  let   inProbationPeriod = false;
  let   currentStreak     = habit.currentStreak;

  if (habit.frequency === 'DAILY') {
    const health = evaluateDailyStreakHealth(
      habit.currentStreak,
      habit.streakProbationPeriodStart,
      lastCompleted,
      today,
    );

    inProbationPeriod = health.inProbationPeriod;

    const needsWrite =
      health.streakBroken ||
      (health.newStreakProbationPeriodStart !== null && habit.streakProbationPeriodStart === null);

    if (needsWrite) {
      if (health.streakBroken) {
        currentStreak = 0;
        await prisma.habit.update({
          where: { id: habitId },
          data:  { currentStreak: 0, streakProbationPeriodStart: null },
        });
      } else if (health.newStreakProbationPeriodStart) {
        await prisma.habit.update({
          where: { id: habitId },
          data:  { streakProbationPeriodStart: health.newStreakProbationPeriodStart },
        });
      }
    }

  } else if (habit.frequency === 'WEEKLY') {
    const health = evaluateWeeklyStreakHealth(habit.currentStreak, lastCompleted, today);
    if (health.streakBroken) {
      currentStreak = 0;
      await prisma.habit.update({
        where: { id: habitId },
        data:  { currentStreak: 0 },
      });
    }

  // Return the habit without the nested checkIns array (client doesn't need it here)
  const { checkIns: _, ...habitData } = habit;
  return { ...habitData, currentStreak, inProbationPeriod };

// ─── Existing read functions (unchanged) ─────────────────────────────────────
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
    where:  { userId },
    select: { id: true },
  });

  const habitIds = habits.map((h) => h.id);

  const start     = new Date(parsedYear, parsedMonth, 1, 0, 0, 0, 0);
  const nextMonth = new Date(parsedYear, parsedMonth + 1, 1, 0, 0, 0, 0);

  const checkins = await prisma.habitCheckIn.findMany({
    where: {
      habitId: { in: habitIds },
      date:    { gte: start, lt: nextMonth },
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

  const habit = await prisma.habit.findUnique({ where: { id: habitId } });

  if (!habit)                  throw { status: 404, message: 'Habit not found' };
  if (habit.userId !== userId) throw { status: 403, message: 'Forbidden' };

  return prisma.habitCheckIn.findMany({
    where:   { habitId },
    orderBy: { date: 'desc' },
  });
}

module.exports = {
  upsertHabitCheckIn,
  getHabitWithStreakHealth,
  getCheckInsForMonth,
  getHabitCheckIns,
};