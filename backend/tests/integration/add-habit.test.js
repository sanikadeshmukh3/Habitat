const request = require('supertest');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const app = require('../../server');

const prisma = new PrismaClient();

describe('Add Custom Habit use case', () => {
  let token;
  let userId;
  const email = 'testuser@example.com';
  const password = 'password123';

  async function cleanupTestUser() {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) return;

    const habits = await prisma.habit.findMany({
      where: { userId: existingUser.id },
      select: { id: true },
    });

    const habitIds = habits.map((h) => h.id);

    if (habitIds.length > 0) {
      await prisma.habitCheckIn.deleteMany({
        where: {
          habitId: { in: habitIds },
        },
      });
    }

    await prisma.habit.deleteMany({
      where: { userId: existingUser.id },
    });

    await prisma.user.deleteMany({
      where: { email },
    });
  }

  beforeAll(async () => {
    await cleanupTestUser();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
      },
    });

    userId = user.id;

    const loginRes = await request(app)
      .post('/login')
      .send({
        email,
        password,
      });

    console.log('LOGIN STATUS:', loginRes.statusCode);
    console.log('LOGIN BODY:', loginRes.body);

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeTruthy();

    token = loginRes.body.token;
  });

  afterAll(async () => {
    await cleanupTestUser();
    await prisma.$disconnect();
  });

  it('creates a custom habit and makes it available on the dashboard', async () => {
    const newHabit = {
      name: 'Eat Protein',
      habitCategory: 'NUTRITION',
      frequency: 'DAILY',
      visibility: true,
    };

    const createRes = await request(app)
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send(newHabit);

    console.log('CREATE STATUS:', createRes.statusCode);
    console.log('CREATE BODY:', createRes.body);

    expect([200, 201]).toContain(createRes.statusCode);
    expect(createRes.body.data).toBeTruthy();
    expect(createRes.body.data.name).toBe('Eat Protein');

    const habitsRes = await request(app)
      .get('/habits')
      .set('Authorization', `Bearer ${token}`);

    console.log('HABITS STATUS:', habitsRes.statusCode);
    console.log('HABITS BODY:', habitsRes.body);

    expect(habitsRes.statusCode).toBe(200);
    expect(Array.isArray(habitsRes.body.data)).toBe(true);

    const createdHabit = habitsRes.body.data.find(
      (habit) => habit.name === 'Eat Protein'
    );

    expect(createdHabit).toBeTruthy();
    expect(createdHabit.habitCategory).toBe('NUTRITION');
    expect(createdHabit.frequency).toBe('DAILY');
    expect(createdHabit.visibility).toBe(true);
    expect(createdHabit.userId).toBe(userId);
  });
});