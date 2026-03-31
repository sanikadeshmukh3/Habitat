const { Router } = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const { upsertCheckIn, getCheckInsForMonth } = require('../controllers/checkinController');

const router = Router();

// Protected endpoints
router.use(authenticateToken);

// POST /checkins  -> body: { habitId, date, completed, difficultyRating, notes }
router.post('/', upsertCheckIn);

// GET /checkins?year=2026&month=2  -> returns map for user's habits in given month
router.get('/', getCheckInsForMonth);

module.exports = router;