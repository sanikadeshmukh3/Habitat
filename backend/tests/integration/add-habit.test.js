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
  const habitName = 'Eat Protein';
  const username = 'testuser_' + Date.now();

  async function cleanupTestUser() {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) return;

    const habits = await prisma.habit.findMany({
      where: { userId: existingUser.id },
      select: { id: true },
    });

    const habitIds = habits.map((habit) => habit.id);

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
        username,
      },
    });

    userId = user.id;

    const loginRes = await request(app)
      .post('/login')
      .send({ email, password });

    console.log('\n[LOGIN TEST]');
    console.log('EXPECTED STATUS: 200');
    console.log('ACTUAL STATUS:', loginRes.statusCode);
    console.log('EXPECTED: token should exist');
    console.log('ACTUAL BODY:', loginRes.body);

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeTruthy();

    token = loginRes.body.token;
  });

  afterAll(async () => {
    await cleanupTestUser();
    await prisma.$disconnect();
  });

  it('should create a custom habit and make it available on the dashboard', async () => {
    const newHabit = {
      name: habitName,
      habitCategory: 'NUTRITION',
      frequency: 'DAILY',
      visibility: true,
    };

    const createRes = await request(app)
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send(newHabit);

    console.log('\n[CREATE HABIT TEST]');
    console.log('EXPECTED STATUS: 201 (or 200)');
    console.log('ACTUAL STATUS:', createRes.statusCode);
    console.log('EXPECTED: created habit name should be', habitName);
    console.log('ACTUAL BODY:', createRes.body);

    expect([200, 201]).toContain(createRes.statusCode);
    expect(createRes.body.data).toBeTruthy();
    expect(createRes.body.data.name).toBe(habitName);

    const habitsRes = await request(app)
      .get('/habits')
      .set('Authorization', `Bearer ${token}`);

    console.log('\n[FETCH HABITS TEST]');
    console.log('EXPECTED STATUS: 200');
    console.log('ACTUAL STATUS:', habitsRes.statusCode);
    console.log(`EXPECTED: habits list should include "${habitName}"`);
    console.log('ACTUAL BODY:', habitsRes.body);

    expect(habitsRes.statusCode).toBe(200);
    expect(Array.isArray(habitsRes.body.data)).toBe(true);

    const createdHabit = habitsRes.body.data.find(
      (habit) => habit.name === habitName
    );

    console.log('\n[VERIFY HABIT EXISTS]');
    console.log(`EXPECTED: found habit "${habitName}" in response`);
    console.log('ACTUAL:', createdHabit);

    expect(createdHabit).toBeTruthy();
    expect(createdHabit.habitCategory).toBe('NUTRITION');
    expect(createdHabit.frequency).toBe('DAILY');
    expect(createdHabit.visibility).toBe(true);
    expect(createdHabit.userId).toBe(userId);
  });
});