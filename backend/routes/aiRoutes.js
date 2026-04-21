const express = require("express");
const router = express.Router();

const aiController = require("../controllers/aiController");
const authenticateToken = require("../middleware/authenticateToken");

router.post("/generate-habits", aiController.handleGenerateHabits);
router.post("/weekly-summary", authenticateToken, aiController.getWeeklySummary);
router.post("/weekly-summary/regenerate", authenticateToken, aiController.regenerateWeeklySummary);

module.exports = router;