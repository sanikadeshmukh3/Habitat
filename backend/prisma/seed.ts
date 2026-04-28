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



// ---------------- JOHN DOE DEMO USER FOR ONBOARDING ----------------

const johnUser = await prisma.user.upsert({
  where: { email: "john@habitat.com" },
  update: {},
  create: {
    email: "john@habitat.com",
    password: hashedPassword,
    username: "johndoe",
    firstName: "John",
    lastName: "Doe",
    isVerified: true,
  },
});

console.log("John Doe demo user created");

// Connect John to existing friends
await prisma.user.update({
  where: { id: johnUser.id },
  data: {
    friends: {
      connect: [
        { id: friend1.id },
        { id: friend2.id },
      ],
    },
  },
});

// Demo habits
const johnHabitCreatedAt = new Date();
johnHabitCreatedAt.setDate(johnHabitCreatedAt.getDate() - 14);
johnHabitCreatedAt.setHours(8, 0, 0, 0);

const johnWorkout = await prisma.habit.upsert({
  where: { id: "john-workout-habit" },
  update: {createdAt: johnHabitCreatedAt},
  create: {
    id: "john-workout-habit",
    name: "Morning Workout",
    description: "Go to the gym before work",
    habitCategory: "FITNESS",
    frequency: "DAILY",
    visibility: true,
    currentStreak: 8,
    active: true,
    userId: johnUser.id,
    createdAt: johnHabitCreatedAt,
    updatedAt: new Date(),
    observationWindowEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});

const johnSleep = await prisma.habit.upsert({
  where: { id: "john-sleep-habit" },
  update: {createdAt: johnHabitCreatedAt},
  create: {
    id: "john-sleep-habit",
    name: "Sleep Before 11 PM",
    description: "Sleep earlier consistently",
    habitCategory: "SLEEP",
    frequency: "DAILY",
    visibility: true,
    currentStreak: 5,
    active: true,
    userId: johnUser.id,
    createdAt: johnHabitCreatedAt,
    updatedAt: new Date(),
    observationWindowEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});

const johnWater = await prisma.habit.upsert({
  where: { id: "john-water-habit" },
  update: {createdAt: johnHabitCreatedAt},
  create: {
    id: "john-water-habit",
    name: "Drink Water",
    description: "Drink 8 glasses daily",
    habitCategory: "NUTRITION",
    frequency: "DAILY",
    visibility: true,
    currentStreak: 12,
    active: true,
    userId: johnUser.id,
    createdAt: johnHabitCreatedAt,
    updatedAt: new Date(),
    observationWindowEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});

// Remove old demo check-ins before reseeding
await prisma.habitCheckIn.deleteMany({
  where: {
    habitId: {
      in: [
        johnWorkout.id,
        johnSleep.id,
        johnWater.id,
      ],
    },
  },
});

// Create last 7 days of realistic check-ins
const demoHabits = [johnWorkout, johnSleep, johnWater];
const demoCheckIns = [];

for (let i = 6; i >= 0; i--) {
  for (const habit of demoHabits) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0);

    demoCheckIns.push({
      habitId: habit.id,
      date,
      completed: Math.random() > 0.2, // mostly completed
      difficultyRating: Math.floor(Math.random() * 3) + 1,
      notes:
        i % 2 === 0
          ? "Stayed consistent today"
          : null,
      pointsEarned: 10,
    });
  }
}

await prisma.habitCheckIn.createMany({
  data: demoCheckIns,
});

await prisma.user.update({
  where: { id: johnUser.id },
  data: {
    points: 210,
  },
});

console.log("John Doe onboarding demo data seeded successfully");


}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });