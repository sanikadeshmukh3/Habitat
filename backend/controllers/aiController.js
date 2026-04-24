const {
  generateHabits,
  getOrCreateWeeklySummary,
  getOrRegenerateWeeklySummary,
} = require("../services/aiService");

const handleGenerateHabits = async (req, res) => {
  try {
    const { goal } = req.body;

    if (!goal || !goal.trim()) {
      return res.status(400).json({
        message: "Please enter habit information for us to generate.",
      });
    }

    const habits = await generateHabits(goal);

    return res.json(habits);
  } catch (err) {
    console.error("AI controller error", err);
    return res.status(500).json({
      message: "Failed to generate habits",
    });
  }
};

const getWeeklySummary = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { weekKey, recap } = req.body;

    if (!weekKey || !recap) {
      return res.status(400).json({
        message: "weekKey and recap are required.",
      });
    }

    const result = await getOrCreateWeeklySummary({
      userId,
      weekKey,
      recap,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Weekly summary controller error", err);
    return res.status(500).json({
      message: "Failed to generate weekly summary.",
    });
  }
};

const regenerateWeeklySummary = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { weekKey, recap } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Authenticated user id is missing from token.",
      });
    }

    if (!weekKey || !recap) {
      return res.status(400).json({
        message: "weekKey and recap are required.",
      });
    }

    const result = await getOrRegenerateWeeklySummary({
      userId,
      weekKey,
      recap,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Regenerate weekly summary controller error:", err);
    return res.status(500).json({
      message: "Failed to regenerate weekly summary.",
    });
  }
};

module.exports = {
  handleGenerateHabits,
  getWeeklySummary,
  regenerateWeeklySummary,
};