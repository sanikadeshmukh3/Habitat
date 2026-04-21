const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getDashboardData = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                habit: { where: { active: true } },
                friends: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        const pendingRequests = await prisma.friendRequest.findMany({
            where: {
                receiverId: userId,
                status: "PENDING",
            },
            include: {
                sender: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        return {
            user: {
                points: user.points ?? 0,
            },
            habits: user.habit.map((h) => ({
                id: h.id,
                name: h.name,
                streak: h.currentStreak,
                progress: 0.6,
            })),
            friends: user.friends.map((f) => ({
                id: f.id,
                name: `${f.firstName} ${f.lastName}`,
                progress: 0.75,
            })),
            // Ensure this is ALWAYS returned, even if empty
            requests: pendingRequests.map((req) => ({
                id: req.id,
                senderId: req.sender.id,
                name: `${req.sender.firstName} ${req.sender.lastName}`,
            })) || [], 
        };
    } catch (err) {
        console.error("Service Error:", err);
        throw err;
    }
};