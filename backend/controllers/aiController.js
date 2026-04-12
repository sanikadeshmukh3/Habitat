const { generateHabits } = require("../services/aiService");

const handleGenerateHabits = async (req, res) => {
    try {
        const { goal } = req.body; // the content that the user enters for what they want their habit to be

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

module.exports = { handleGenerateHabits };