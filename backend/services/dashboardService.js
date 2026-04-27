const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// helper function to compute WEEKLY streak for display on habit card
function computeWeeklyStreak(checkIns) {
    
  console.log('=== computeWeeklyStreak called ===');
  console.log('Total check-ins:', checkIns.length);
  console.log('Completed check-ins:', checkIns.filter(c => c.completed).map(c => c.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // build a Set of local date strings for all completed check-ins
  const completedKeys = new Set(
    checkIns
      .filter((c) => c.completed)
      .map((c) => {
        const d = new Date(c.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
  );

  const currentWeekSunday = new Date(today);
  currentWeekSunday.setDate(today.getDate() - today.getDay());

  let streak = 0;
  let weekOffset = 0;

  while (weekOffset <= 52) {
    const weekSunday = new Date(currentWeekSunday);
    weekSunday.setDate(currentWeekSunday.getDate() - weekOffset * 7);

    // check each day of this week for a completion
    let hasCompletion = false;
    for (let day = 0; day < 7; day++) {
      const d = new Date(weekSunday);
      d.setDate(weekSunday.getDate() + day);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (completedKeys.has(key)) {
        hasCompletion = true;
        break;
      }
    }

    const weekSaturday = new Date(weekSunday);
    weekSaturday.setDate(weekSunday.getDate() + 6);

    if (hasCompletion) {
      streak++;
    } else if (weekSaturday >= today) {
      // current week, no check-in yet — don't penalize
    } else {
      break;
    }

    weekOffset++;
  }
  
  console.log('Computed weekly streak:', streak);

  return streak;
}

exports.getDashboardData = async (userId) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday   = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        habit: {
          where: { active: true },
          include: {
            checkIns: {
              select: { completed: true, date: true },
            },
          },
        },
        friends: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const pendingRequests = await prisma.friendRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      user: { points: user.points ?? 0 },
      habits: user.habit.map((h) => {
        const total     = h.checkIns.length;
        const completed = h.checkIns.filter((c) => c.completed).length;
        const isCompletedToday = h.checkIns.some(
          (c) => c.date >= startOfToday && c.date < endOfToday && c.completed
        );

        return {
          id:               h.id,
          name:             h.name,
          streak:           h.frequency === 'WEEKLY' ? computeWeeklyStreak(h.checkIns) : h.currentStreak,
          category:         h.habitCategory,   // e.g. "FITNESS"
          frequency:        h.frequency,       // e.g. "DAILY" | "WEEKLY"
          completionRate:   total > 0 ? completed / total : 0,
          isCompletedToday,
        };
      }),
      friends: user.friends.map((f) => ({
        id:       f.id,
        name:     `${f.firstName} ${f.lastName}`,
        progress: 0.75,
      })),
      requests: pendingRequests.map((req) => ({
        id:       req.id,
        senderId: req.sender.id,
        name:     `${req.sender.firstName} ${req.sender.lastName}`,
      })),
    };
  } catch (err) {
    console.error("Service Error:", err);
    throw err;
  }
};