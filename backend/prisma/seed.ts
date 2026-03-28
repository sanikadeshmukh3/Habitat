import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// changing seed.ts temporarily for testing purposes

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      email: "test@test.com",
      password: hashedPassword,
      firstName: "Test",
      lastName: "User",
    },
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