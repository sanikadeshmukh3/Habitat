const { Router } = require('express');
const { getHabits, getHabitById, createHabit, updateHabit } = require('../controllers/habit-controller');

const router = Router();

router.get('/',      getHabits);
router.get('/:id',   getHabitById);
router.post('/',     createHabit);
router.patch('/:id', updateHabit);

module.exports = router;