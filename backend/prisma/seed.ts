import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      email: "test@test.com",
      password: "password123"
    }
  });

  console.log("Seed user created");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
