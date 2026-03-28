const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getDashboardData = async (userId) => {
    const habits = await prisma.habit.findMany({
        where: { userId, active: true},
    });

    // insert the friends section here

    return {
        habits: habits.map(h => ({
            id: h.id,
            name: h.name,
            streak: h.currentStreak,
            progress: 0.6,
        }))
        // add friends to the return statement too
    };
};