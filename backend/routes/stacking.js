const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticateToken = require('../middleware/authenticateToken');

const { acceptActivation, snoozeActivationSuggestion, manuallyUnlockHabit } = require('../services/activationService');
const { generateSuggestedRanking } = require('../services/stackingTriggerService');
const { enrollUserInStacking, optOutOfStacking, addHabitToActiveSchedule, reorderPendingEntries } = require('../services/enrollmentService');
const { checkProvingWindowProgress } = require('../services/provingWindowService');

// GET /stacking/ranking
// returns the pre-populated suggested ranking for the habit ranking screen
// tier 2 habits appear first (sorted by descending consistency score)
// followed by tier 3 habits (sorted by descending consistency score)
// tier 1 habits are excluded — they are locked at the top on the frontend
router.get('/ranking', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const ranking = await generateSuggestedRanking(userId);
    return res.status(200).json({ ranking });
  } catch (error) {
    console.error('Error in GET /ranking:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stacking/enroll
// enrolls a user in a habit stacking schedule
// expects rankedHabitIds — the final ordered list of tier 2 and tier 3 habit IDs
// confirmed by the user on the habit ranking screen
// deactivates all habits except the first, which immediately enters its proving window
router.post('/enroll', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rankedHabitIds } = req.body;

    if (!rankedHabitIds || !Array.isArray(rankedHabitIds)) {
      return res.status(400).json({ error: 'rankedHabitIds is required and must be an array' });
    }

    if (rankedHabitIds.length === 0) {
      return res.status(400).json({ error: 'rankedHabitIds cannot be empty' });
    }

    const existingEnrollment = await prisma.stackingEnrollment.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (existingEnrollment) {
      return res.status(409).json({ error: 'User is already enrolled in an active stacking schedule' });
    }

    const enrollment = await enrollUserInStacking(userId, rankedHabitIds);
    return res.status(201).json({ enrollment });
  } catch (error) {
    console.error('Error in POST /enroll:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stacking/opt-out
// opts a user out of their active stacking schedule at any time
// immediately reactivates all habits that were made dormant by the schedule
router.post('/opt-out', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId } = req.body;

    if (!enrollmentId) {
      return res.status(400).json({ error: 'enrollmentId is required' });
    }

    const enrollment = await prisma.stackingEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Enrollment is not active' });
    }

    // ensure the enrollment belongs to the authenticated user
    if (enrollment.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await optOutOfStacking(enrollmentId);
    return res.status(200).json({ message: 'Successfully opted out of stacking schedule' });
  } catch (error) {
    console.error('Error in POST /opt-out:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stacking/add-habit
// handles a new habit being added while the user is in an active stacking schedule
// the new habit is immediately deactivated and appended to the pending queue
router.post('/add-habit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { habitId } = req.body;

    if (!habitId) {
      return res.status(400).json({ error: 'habitId is required' });
    }

    const result = await addHabitToActiveSchedule(userId, habitId);

    if (!result) {
      return res.status(200).json({ message: 'No active enrollment — habit added normally' });
    }

    return res.status(201).json({
      message: 'Habit added to stacking schedule — please re-rank your inactive habits',
      enrollmentId: result.enrollmentId,
      newEntryId:   result.newEntryId,
    });
  } catch (error) {
    console.error('Error in POST /add-habit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stacking/accept
// user accepts the activation suggestion for the next habit in the queue
// the next pending habit becomes active and starts its proving window
router.post('/accept', authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.body;

    if (!entryId) {
      return res.status(400).json({ error: 'entryId is required' });
    }

    const entry = await prisma.stackingScheduleEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entry.status !== 'PENDING') {
      return res.status(400).json({ error: 'Entry is not pending activation' });
    }

    await acceptActivation(entryId);
    return res.status(200).json({ message: 'Habit successfully activated' });
  } catch (error) {
    console.error('Error in POST /accept:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stacking/snooze
// user snoozes the activation suggestion for the next habit in the queue
// the suggestion resurfaces after the 5-day snooze window
// users can snooze unlimited times
router.post('/snooze', authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.body;

    if (!entryId) {
      return res.status(400).json({ error: 'entryId is required' });
    }

    const { resurfaceAt } = await snoozeActivationSuggestion(entryId);
    return res.status(200).json({
      message: 'Activation suggestion snoozed',
      resurfaceAt,
    });
  } catch (error) {
    console.error('Error in POST /snooze:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stacking/unlock
// user manually unlocks a dormant habit before its proving window completes
// bypasses the proving window of the currently active entry
// the target habit is immediately activated regardless of its position in the queue
router.post('/unlock', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId, targetHabitId } = req.body;

    if (!enrollmentId || !targetHabitId) {
      return res.status(400).json({ error: 'enrollmentId and targetHabitId are required' });
    }

    const result = await manuallyUnlockHabit(enrollmentId, targetHabitId);

    if (!result) {
      return res.status(400).json({ error: 'Could not unlock habit — check that the enrollment and habit are valid' });
    }

    return res.status(200).json({
      message:          'Habit manually unlocked',
      activatedHabitId: result.activatedHabitId,
    });
  } catch (error) {
    console.error('Error in POST /unlock:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stacking/reorder
// user reorders the pending queue on the habit ranking screen
// called when the user reorganizes inactive habits, including after a new habit
// is added mid-schedule — the currently active entry is never affected
router.post('/reorder', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId, reorderedHabitIds } = req.body;

    if (!enrollmentId || !reorderedHabitIds || !Array.isArray(reorderedHabitIds)) {
      return res.status(400).json({ error: 'enrollmentId and reorderedHabitIds are required' });
    }

    await reorderPendingEntries(enrollmentId, reorderedHabitIds);
    return res.status(200).json({ message: 'Queue successfully reordered' });
  } catch (error) {
    console.error('Error in POST /reorder:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stacking/progress/:enrollmentId
// returns proving window progress data for the currently active entry
// used by the stacking status card on the dashboard to display:
// - current consistency score vs the 80% unlock threshold
// - days remaining in the proving window
// - whether the proving window target date has passed
router.get('/progress/:enrollmentId', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const activeEntry = await prisma.stackingScheduleEntry.findFirst({
      where: { enrollmentId, status: 'ACTIVE' },
    });

    if (!activeEntry) {
      return res.status(404).json({ error: 'No active entry found for this enrollment' });
    }

    const progress = await checkProvingWindowProgress(activeEntry.id);
    return res.status(200).json({ progress });
  } catch (error) {
    console.error('Error in GET /progress:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stacking/enrollment
// returns the active enrollment for the authenticated user if one exists
// used by the dashboard to determine whether to show the stacking status card
router.get('/enrollment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const enrollment = await prisma.stackingEnrollment.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (!enrollment) {
      return res.status(200).json({ enrollmentId: null });
    }

    return res.status(200).json({ enrollmentId: enrollment.id });
  } catch (error) {
    console.error('Error in GET /enrollment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stacking/entry/:entryId
// returns the details of a specific schedule entry including habit name
// used by the frontend to display habit names in the activation suggestion modal
router.get('/entry/:entryId', authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.params;

    const entry = await prisma.stackingScheduleEntry.findUnique({
      where: { id: entryId },
      include: { habit: true },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    return res.status(200).json({
      entryId:      entry.id,
      habitId:      entry.habitId,
      habitName:    entry.habit.name,
      status:       entry.status,
      priorityRank: entry.priorityRank,
    });
  } catch (error) {
    console.error('Error in GET /entry:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stacking/schedule/:enrollmentId
// returns the currently active entry and all pending entries for a given enrollment
// used by the habit ranking screen in reorder mode to display the current schedule state
router.get('/schedule/:enrollmentId', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const activeEntry = await prisma.stackingScheduleEntry.findFirst({
      where: { enrollmentId, status: 'ACTIVE' },
      include: { habit: true },
    });

    const pendingEntries = await prisma.stackingScheduleEntry.findMany({
      where:   { enrollmentId, status: 'PENDING' },
      include: { habit: true },
      orderBy: { priorityRank: 'asc' },
    });

    return res.status(200).json({
      activeEntry: activeEntry ? {
        habitId:      activeEntry.habitId,
        habitName:    activeEntry.habit.name,
        priorityRank: activeEntry.priorityRank,
      } : null,
      pendingEntries: pendingEntries.map((e) => ({
        habitId:          e.habitId,
        habitName:        e.habit.name,
        tier:             e.habit.tier,
        consistencyScore: e.habit.consistencyScore,
        frequency:        e.habit.frequency,
        suggestedRank:    e.priorityRank,
      })),
    });
  } catch (error) {
    console.error('Error in GET /schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stacking/app-open
// called every time the dashboard mounts or regains focus
// runs the full monitoring pipeline (or proving window check only if enrolled)
// and returns everything the dashboard needs to decide which modals to show:
// - enrollmentId: present if the user has an active stacking schedule
// - triggerStacking: true if the enrollment modal should be shown
// - triggeringHabitNames: habit names to display in the enrollment modal
// - activationSuggestion: present if the activation modal should be shown
router.post('/app-open', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { runOnAppOpen } = require('../services/activationService');

    // get the active enrollment id upfront — needed by the dashboard
    // regardless of whether the monitoring pipeline triggers anything
    const enrollment = await prisma.stackingEnrollment.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    const results = await runOnAppOpen(userId);

    // if any entries hit the unlock threshold, build the activation suggestion
    // so the dashboard can show the activation modal without an extra fetch
    let activationSuggestion = null;
    const unlockResults = results.provingWindowResults?.unlockResults ?? [];

    if (unlockResults.length > 0) {
      const firstUnlock = unlockResults[0];

      if (!firstUnlock.scheduleComplete && firstUnlock.nextEntryId) {
        const nextEntry = await prisma.stackingScheduleEntry.findUnique({
          where: { id: firstUnlock.nextEntryId },
          include: { habit: true },
        });

        const readyEntry = results.provingWindowResults.readyToUnlock[0];

        activationSuggestion = {
          nextEntryId:        firstUnlock.nextEntryId,
          nextHabitName:      nextEntry?.habit?.name ?? '',
          completedHabitName: readyEntry?.habitName ?? '',
        };
      }
    }

    return res.status(200).json({
      enrollmentId:        enrollment?.id ?? null,
      triggerStacking:     results.triggerStacking ?? false,
      triggeringHabitNames: results.triggeringHabitNames ?? [],
      activationSuggestion,
    });
  } catch (error) {
    console.error('Error in POST /app-open:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;