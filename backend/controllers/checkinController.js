const {
  upsertHabitCheckIn,
  getCheckInsForMonth,
  getHabitCheckIns,
} = require('../services/checkinService');

async function upsertCheckIn(req, res, next) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { habitId } = req.body;

    const checkIn = await upsertHabitCheckIn(userId, habitId, req.body);
    return res.status(200).json({ data: checkIn });
  } catch (err) {
    next(err);
  }
}

async function getCheckInsForMonthController(req, res, next) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await getCheckInsForMonth(
      userId,
      req.query.year,
      req.query.month
    );

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function getCheckInsForHabit(req, res, next) {
  try {
    const userId = req.user?.userId;
    const { habitId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const checkIns = await getHabitCheckIns(userId, habitId);
    return res.json({ data: checkIns });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upsertCheckIn,
  getCheckInsForMonth: getCheckInsForMonthController,
  getCheckInsForHabit,
};