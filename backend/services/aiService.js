const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateHabits = async (goal) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a habit-building assistant.

Return ONLY valid JSON (no text before or after).

Return an array of 5 habits in this format:
[
  {
    "id": "string",
    "name": "string",
    "category": "Fitness | Nutrition | Wellness | Productivity | Sleep",
    "emoji": "emoji",
    "frequency": "Daily",
    "reason": "short explanation"
  }
]
        `,
      },
      {
        role: "user",
        content: goal,
      },
    ],
  });

  const text = response.choices[0].message.content;

  try {
    const parsed = JSON.parse(text);

    return parsed.map((item, index) => ({
      id: item.id || String(index),
      name: item.name,
      category: item.category,
      emoji: item.emoji || "🌿",
      frequency: item.frequency || "Daily",
      reason: item.reason,
    }));
  } catch (err) {
    console.error("AI PARSE ERROR: ", text);
    throw new Error("invalid AI response");
  }

};

module.exports = { generateHabits };


