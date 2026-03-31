const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const dashboardController = require("../controllers/dashboardController");

router.get("/", authenticateToken, dashboardController.getDashboard); // no need for the manual userID

module.exports = router;