const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getDashboardData = async (userId) => {
    /*const habits = await prisma.habit.findMany({
        where: { userId, active: true},
    });*/

    // insert the friends section here
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            habit: {
                where: {active: true},
            },
            friends: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });
    return {
        habits: user.habit.map(h => ({
            id: h.id,
            name: h.name,
            streak: h.currentStreak,
            progress: 0.6,
        })),
        friends: user.friends.map(f => ({
            id: f.id,
            name: `${f.firstName} ${f.lastName}`,
            progress: 0.75,
        })),
    };
};