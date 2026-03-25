import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// changing seed.ts temporarily for testing purposes

async function main() {
  const user = await prisma.user.upsert({
    where: { email : "test@test.com" },
    update: {},
    create: {
      email: "test@test.com",
      password: "password123"
    }
  });

  console.log("Seed user created");

  // creating a temporary habit as well, we won't need this later on
  const habit = await prisma.habit.create({
    data: {
      name: "Workout",
      description: "Go to the gym 3 days a week",
      habitCategory: "FITNESS",
      frequency: "WEEKLY",
      visibility: true,
      currentStreak: 1,
      active: true,
      userId: user.id,
    },
  });

  
}



main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
