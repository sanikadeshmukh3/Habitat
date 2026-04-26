import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// changing seed.ts temporarily for testing purposes

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "test@test.com"},
    update: {},
    create: {
      email: "test@test.com",
      password: hashedPassword,
      username: 'test123',
      firstName: "Test",
      lastName: "User",
      isVerified: true,
    },
  });

  console.log("Seed user created");

  // the temp friends to be able to test this functionality out -- actual functionality in 1.0 release
  const friend1 = await prisma.user.upsert({
    where: {email: "friend1@test.com" },
    update: {},
    create: {
      email: "friend1@test.com",
      password: hashedPassword,
      username: 'friend1',
      firstName: "Alice",
      lastName: "Green",
      isVerified: true,
    },
  });

  const friend2 = await prisma.user.upsert({
    where: {email: "friend2@test.com" },
    update: {},
    create: {
      email: "friend2@test.com",
      password: hashedPassword,
      username: 'Bobby1',
      firstName: "Bobby",
      lastName: "Blue",
      isVerified: true,
    },
  });

  // the actual testing
  await prisma.user.update({
    where: {id: user.id },
    data: {
      friends: {
        connect: [
          {id: friend1.id},
          {id: friend2.id},
        ],
      },
    },
  });

  console.log("Friends and user seeded...");

  // creating a temporary habit as well, we won't need this later on
  const habit = await prisma.habit.upsert({
    where: { id: "seeded-workout-habit",},
    update: {},
    create: {
      id: "seeded-workout-habit",
      name: "Workout",
      description: "Go to the gym 3 days a week",
      habitCategory: "FITNESS",
      frequency: "WEEKLY",
      visibility: true,
      currentStreak: 1,
      active: true,
      userId: user.id,
      updatedAt: new Date(),
      // observation window for a weekly habit is 8 weeks (56 days) from creation
      observationWindowEnd: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000),
    },
  });

  const ALL_BADGES = [
  "starting_out",
  "getting_into_it",
  "really_habitual",
  "humble_leaf",
  "automaticity_achieved",
  "streak_starter",
  "streak_warrior",
  "streak_legend",
  "point_collector",
  "point_hoarder",
];

  const b_user = await prisma.user.upsert({
    where: { email: "badge@badge.com"},
    update: {},
    create: {
      email: "badge@badge.com",
      password: hashedPassword,
      username: 'badgeUser',
      firstName: "Badge",
      lastName: "User",
      isVerified: true,
    },
  });

  await prisma.userBadge.createMany({
  data: ALL_BADGES.map((badgeId) => ({
    userId: b_user.id,
    badgeId,
    earnedAt: new Date(),
  })),
  skipDuplicates: true,
});

//   const teethHabit = await prisma.habit.upsert({
//   where: { id: "seeded-teeth-habit" },
//   update: {},
//   create: {
//     id: "seeded-teeth-habit",
//     name: "Brush Teeth",
//     description: "Brush teeth every day",
//     habitCategory: "WELLNESS",
//     frequency: "DAILY",
//     visibility: true,
//     currentStreak: 0,
//     active: true,
//     userId: b_user.id,
//     observationWindowEnd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
//   },
// });

// await prisma.habitCheckIn.deleteMany({
//   where: { habitId: teethHabit.id },
// });

// const days = 156;
// const now = new Date();
// const HOUR = 8;

// const checkIns = [];

// for (let i = days - 1; i >= 0; i--) {
//   const date = new Date();
//   date.setDate(now.getDate() - i);
//   date.setHours(HOUR, 0, 0, 0);

//   checkIns.push({
//     habitId: teethHabit.id,
//     date,
//     completed: true,
//     pointsEarned: 10, // optional
//   });
// }

// await prisma.habitCheckIn.createMany({
//   data: checkIns,
// });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });