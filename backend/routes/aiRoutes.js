const express = require("express");
const router = express.Router();

const { handleGenerateHabits } = require("../controllers/aiController");

router.post("/generate-habits", handleGenerateHabits);

module.exports = router;