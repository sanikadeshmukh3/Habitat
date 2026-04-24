const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
          streak:           h.currentStreak,
          category:         h.habitCategory,   // e.g. "FITNESS"
          frequency:        h.frequency,        // e.g. "DAILY" | "WEEKLY"
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