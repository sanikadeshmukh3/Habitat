const { Router } = require('express');
const { getHabits, getHabitById, createHabit, updateHabit, deleteHabit } = require('../controllers/habit-controller');
const authenticateToken = require('../middleware/authenticateToken');

const router = Router();

router.get('/', authenticateToken, getHabits);
router.get('/:id', authenticateToken, getHabitById);
router.post('/', authenticateToken, createHabit);
router.patch('/:id', authenticateToken, updateHabit);
router.delete('/:id', authenticateToken, deleteHabit);

module.exports = router;