const { Router } = require('express');
const {
  getUserProfile,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
} = require('../controllers/user-controller');

const router = Router();

// ── Profile ────────────────────────────────────────────────────────────────────
router.get  ('/:id',          getUserProfile);
router.patch('/:id',          updateUserProfile);

// ── Settings (sub-resource so the settings screen can fetch independently) ─────
router.get  ('/:id/settings', getUserSettings);
router.patch('/:id/settings', updateUserSettings);

module.exports = router;