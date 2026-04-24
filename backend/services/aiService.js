const OpenAI = require("openai");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

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
    "frequency": "Daily | Weekly",
    "reason": "short explanation"
  }
]`,
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
    console.error("AI PARSE ERROR:", text);
    throw new Error("invalid AI response");
  }
};

// -------------------------------------
// WEEKLY CHECK-IN DATA HELPERS
// -------------------------------------
function hasEnoughWeeklyData(recap, weeklyContext) {
  const completionPercent = recap?.snapshots?.completionPulse?.percent ?? 0;
  const strongDays = recap?.snapshots?.rhythmCheck?.strongDays ?? 0;
  const moodLabel = recap?.snapshots?.moodBoard?.label ?? null;
  const checkInCount = weeklyContext?.checkInCount ?? 0;
  const noteCount = weeklyContext?.noteCount ?? 0;

  return (
    completionPercent > 0 ||
    strongDays > 0 ||
    !!moodLabel ||
    checkInCount > 0 ||
    noteCount > 0
  );
}

function normalizeDateRange(weekStart, weekEnd) {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function getWeeklyCheckInContext({ userId, weekStart, weekEnd }) {
  const { start, end } = normalizeDateRange(weekStart, weekEnd);

  const checkIns = await prisma.habitCheckIn.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      habit: {
        userId,
      },
    },
    include: {
      habit: {
        select: {
          id: true,
          name: true,
          habitCategory: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  const difficultyValues = checkIns
    .map((c) => c.difficultyRating)
    .filter((v) => typeof v === "number");

  const notes = checkIns
    .filter((c) => c.notes && c.notes.trim().length > 0)
    .map((c) => ({
      date: c.date,
      note: c.notes.trim(),
      difficultyRating: c.difficultyRating,
      completed: c.completed,
      habitName: c.habit?.name ?? "Unknown habit",
      category: c.habit?.habitCategory ?? "OTHER",
    }));

  const avgDifficulty =
    difficultyValues.length > 0
      ? Number(
          (
            difficultyValues.reduce((sum, value) => sum + value, 0) /
            difficultyValues.length
          ).toFixed(2)
        )
      : null;

  return {
    checkInCount: checkIns.length,
    completedCount: checkIns.filter((c) => c.completed).length,
    avgDifficulty,
    noteCount: notes.length,
    notes: notes.slice(0, 10),
  };
}

function buildSourceHash({ recap, weeklyContext }) {
  const source = JSON.stringify({
    recap,
    weeklyContext,
  });

  return crypto.createHash("sha256").update(source).digest("hex");
}

function buildWeeklySummaryPrompt(recap, weeklyContext) {
  const formattedNotes =
    weeklyContext.notes.length > 0
      ? weeklyContext.notes
          .map(
            (n, index) =>
              `${index + 1}. [${n.habitName} | ${n.category} | difficulty: ${
                n.difficultyRating ?? "N/A"
              } | completed: ${n.completed ? "yes" : "no"}] ${n.note}`
          )
          .join("\n")
      : "No written notes this week.";

  return `
You are writing a short weekly reflection for a habit-tracking app called Habitat.

Write a weekly summary in 2 to 4 sentences.

Rules:
- Sound warm, reflective, calm, and encouraging.
- Be specific to the data provided.
- Use the user's notes and difficulty trends when relevant.
- Mention emotional tone or friction if it appears in the notes, but do not sound clinical.
- Do not use bullet points.
- Do not sound robotic.
- Do not exaggerate.
- If the week was inconsistent or difficult, acknowledge that honestly but supportively.
- Focus on what most defined the user's week overall.
- Return only the summary text.

Weekly recap data:
Week start: ${recap.weekStart ?? "N/A"}
Week end: ${recap.weekEnd ?? "N/A"}

Archetype:
- animal: ${recap.archetype?.animal ?? "N/A"}
- title: ${recap.archetype?.title ?? "N/A"}
- description: ${recap.archetype?.description ?? "N/A"}

Scores:
- completionScore: ${recap.scores?.completionScore ?? "N/A"}
- consistencyScore: ${recap.scores?.consistencyScore ?? "N/A"}
- streakScore: ${recap.scores?.streakScore ?? "N/A"}
- reflectionScore: ${recap.scores?.reflectionScore ?? "N/A"}
- activityScore: ${recap.scores?.activityScore ?? "N/A"}

Completion pulse:
- percent: ${recap.snapshots?.completionPulse?.percent ?? "N/A"}
- insight: ${recap.snapshots?.completionPulse?.insight ?? "N/A"}

Category leader:
- topCategory: ${recap.snapshots?.categoryLeader?.topCategory ?? "N/A"}
- topPercent: ${recap.snapshots?.categoryLeader?.topPercent ?? "N/A"}
- weakestCategory: ${recap.snapshots?.categoryLeader?.weakestCategory ?? "N/A"}
- weakestPercent: ${recap.snapshots?.categoryLeader?.weakestPercent ?? "N/A"}
- insight: ${recap.snapshots?.categoryLeader?.insight ?? "N/A"}

Rhythm check:
- bestDay: ${recap.snapshots?.rhythmCheck?.bestDay ?? "N/A"}
- weakestDay: ${recap.snapshots?.rhythmCheck?.weakestDay ?? "N/A"}
- strongDays: ${recap.snapshots?.rhythmCheck?.strongDays ?? "N/A"}
- insight: ${recap.snapshots?.rhythmCheck?.insight ?? "N/A"}

Mood board:
- label: ${recap.snapshots?.moodBoard?.label ?? "N/A"}
- averageDifficulty: ${recap.snapshots?.moodBoard?.averageDifficulty ?? "N/A"}
- insight: ${recap.snapshots?.moodBoard?.insight ?? "N/A"}

Weekly check-in context:
- totalCheckIns: ${weeklyContext.checkInCount}
- completedCheckIns: ${weeklyContext.completedCount}
- averageDifficultyFromCheckIns: ${weeklyContext.avgDifficulty ?? "N/A"}
- noteCount: ${weeklyContext.noteCount}

User notes:
${formattedNotes}
`.trim();
}

async function createWeeklySummaryFromAI(recap, weeklyContext) {
  const prompt = buildWeeklySummaryPrompt(recap, weeklyContext);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an insightful, supportive assistant for a habit tracking app. Return only the weekly summary text.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const text = response.choices[0].message.content?.trim();

  if (!text) {
    throw new Error("Empty AI summary response");
  }

  return text;
}

// -------------------------------------
// CACHE HELPERS
// -------------------------------------
const getCachedWeeklySummary = async ({ userId, weekKey }) => {
  return prisma.weeklySummary.findUnique({
    where: {
      userId_weekKey: {
        userId,
        weekKey,
      },
    },
  });
};

const createWeeklySummary = async ({
  userId,
  weekKey,
  summary,
  sourceHash,
  refreshCount = 0,
}) => {
  return prisma.weeklySummary.create({
    data: {
      userId,
      weekKey,
      summary,
      sourceHash,
      refreshCount,
    },
  });
};

const updateWeeklySummary = async ({ id, summary, sourceHash, refreshCount }) => {
  return prisma.weeklySummary.update({
    where: { id },
    data: {
      summary,
      sourceHash,
      refreshCount,
    },
  });
};

// -------------------------------------
// MAIN SUMMARY LOGIC
// -------------------------------------
function isWeekComplete(weekEnd) {
  const end = new Date(weekEnd);
  end.setHours(23, 59, 59, 999);

  return new Date() > end;
}

const getOrCreateWeeklySummary = async ({ userId, weekKey, recap }) => {
  if (!userId) {
    throw new Error("userId is required for weekly summary generation");
  }

  if (!recap?.weekStart || !recap?.weekEnd) {
    throw new Error("recap.weekStart and recap.weekEnd are required");
  }

  // Only allow completed weeks
  if (!isWeekComplete(recap.weekEnd)) {
    return {
      summary: null,
      fromCache: false,
      available: false,
      message: "Weekly summary becomes available after the week is complete.",
      refreshCount: 0,
      refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES,
    };
  }

  // Pull check-in data
  const weeklyContext = await getWeeklyCheckInContext({
    userId,
    weekStart: recap.weekStart,
    weekEnd: recap.weekEnd,
  });

  // Build hash for cache invalidation
  const sourceHash = buildSourceHash({ recap, weeklyContext });

  // Check existing cache
  const existing = await getCachedWeeklySummary({ userId, weekKey });

  if (existing && existing.sourceHash === sourceHash) {
    return {
      summary: existing.summary,
      fromCache: true,
      available: true,
      refreshCount: existing.refreshCount ?? 0,
      refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES - (existing.refreshCount ?? 0),
    };
  }

  // Not enough data fallback
  if (!hasEnoughWeeklyData(recap, weeklyContext)) {
    return {
      summary:
        "There wasn’t enough activity last week to generate a meaningful reflection yet.",
      fromCache: false,
      available: true,
      refreshCount: 0,
      refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES,
    };
  }

  // Generate AI summary
  const summary = await createWeeklySummaryFromAI(recap, weeklyContext);

  // Update or create cache
  if (existing) {
    const updated = await updateWeeklySummary({
      id: existing.id,
      summary,
      sourceHash,
    });

    return {
      summary: updated.summary,
      fromCache: false,
      available: true,
      refreshCount: updated.refreshCount ?? 0,
      refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES - (updated.refreshCount ?? 0),
    };
  }

  const saved = await createWeeklySummary({
    userId,
    weekKey,
    summary,
    sourceHash,
  });

  return {
    summary: saved.summary,
    fromCache: false,
    available: true,
    refreshCount: saved.refreshCount ?? 0,
    refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES - (saved.refreshCount ?? 0),
  };
};

const MAX_WEEKLY_SUMMARY_REFRESHES = 3;

const getOrRegenerateWeeklySummary = async ({ userId, weekKey, recap }) => {
  if (!userId) {
    throw new Error("userId is required for weekly summary regeneration");
  }

  if (!recap?.weekStart || !recap?.weekEnd) {
    throw new Error("recap.weekStart and recap.weekEnd are required");
  }

  if (!isWeekComplete(recap.weekEnd)) {
    return {
      summary: null,
      fromCache: false,
      available: false,
      message: "Weekly summary becomes available after the week is complete.",
      refreshCount: 0,
      refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES,
    };
  }

  const weeklyContext = await getWeeklyCheckInContext({
    userId,
    weekStart: recap.weekStart,
    weekEnd: recap.weekEnd,
  });

  if (!hasEnoughWeeklyData(recap, weeklyContext)) {
    return {
      summary:
        "There wasn’t enough activity last week to generate a meaningful reflection yet.",
      fromCache: false,
      available: true,
      refreshCount: 0,
      refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES,
    };
  }

  const sourceHash = buildSourceHash({ recap, weeklyContext });
  const existing = await getCachedWeeklySummary({ userId, weekKey });

  if (!existing) {
    const summary = await createWeeklySummaryFromAI(recap, weeklyContext);

    const saved = await createWeeklySummary({
      userId,
      weekKey,
      summary,
      sourceHash,
      refreshCount: 0,
    });

    return {
      summary: saved.summary,
      fromCache: false,
      available: true,
      refreshCount: saved.refreshCount ?? 0,
      refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES - (saved.refreshCount ?? 0),
    };
  }

  if ((existing.refreshCount ?? 0) >= MAX_WEEKLY_SUMMARY_REFRESHES) {
    return {
      summary: existing.summary,
      fromCache: true,
      available: true,
      message: "You’ve used all 3 refreshes for this week’s summary.",
      refreshCount: existing.refreshCount ?? 0,
      refreshesRemaining: 0,
    };
  }

  const summary = await createWeeklySummaryFromAI(recap, weeklyContext);

  const updated = await updateWeeklySummary({
    id: existing.id,
    summary,
    sourceHash,
    refreshCount: (existing.refreshCount ?? 0) + 1,
  });

  return {
    summary: updated.summary,
    fromCache: false,
    available: true,
    refreshCount: updated.refreshCount ?? 0,
    refreshesRemaining: MAX_WEEKLY_SUMMARY_REFRESHES - (updated.refreshCount ?? 0),
  };
};

module.exports = {
  generateHabits,
  getCachedWeeklySummary,
  createWeeklySummary,
  getOrCreateWeeklySummary,
  getOrRegenerateWeeklySummary,
};