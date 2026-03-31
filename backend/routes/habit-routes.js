const { Router } = require('express');
const { getHabits, getHabitById, createHabit, updateHabit } = require('../controllers/habit-controller');
const authenticateToken = require('../middleware/authenticateToken');

const router = Router();

router.get('/', authenticateToken, getHabits);
router.get('/:id', authenticateToken, getHabitById);
router.post('/', authenticateToken, createHabit);
router.patch('/:id', authenticateToken, updateHabit);

module.exports = router;