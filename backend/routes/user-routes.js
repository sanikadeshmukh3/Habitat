const { Router } = require('express');
const {
  getUserProfile,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
} = require('../controllers/user-controller');
const authenticateToken = require("../middleware/authenticateToken");

const router = Router();

// ── Profile ────────────────────────────────────────────────────────────────────
router.get  ('/me', authenticateToken,          getUserProfile);
router.patch('/me', authenticateToken,          updateUserProfile);

// ── Settings (sub-resource so the settings screen can fetch independently) ─────
router.get  ('/me/settings', authenticateToken, getUserSettings);
router.patch('/me/settings', authenticateToken, updateUserSettings);

module.exports = router;