/**
 * Wrapped Weekly Summary Integration Test
 *
 * Tests Habitat's Wrapped AI summary backend endpoint WITHOUT touching
 * the real database or OpenAI API.
 *
 * This test verifies:
 * 1. A user can authenticate successfully using mocked Prisma data
 * 2. A valid recap payload can be sent to the weekly summary endpoint
 * 3. The backend returns a weekly summary response
 * 4. Unauthorized users cannot access the endpoint
 *
 * TECHNOLOGIES:
 * - Jest
 * - Supertest
 * - Mocked Prisma Client
 * - Mocked OpenAI Client
 */

const bcrypt = require("bcrypt");

/**
 * Mock Prisma Client.
 * This prevents tests from writing to the real database.
 */
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },

  weeklySummary: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },

  habit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },

  habitCheckIn: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },

  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

/**
 * Mock OpenAI Client.
 * This prevents tests from requiring OPENAI_API_KEY or making real API calls.
 */
jest.mock("openai", () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content:
                  "You maintained strong consistency this week and stayed on track with your habits.",
              },
            },
          ],
        }),
      },
    },
  }));

  return {
    __esModule: true,
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

/**
 * Import app AFTER mocks.
 * This is important because server.js imports routes/controllers/services,
 * which create Prisma and OpenAI clients.
 */
const request = require("supertest");
const app = require("../../server");

let token;
let testUser;

describe("Habitat Wrapped Weekly Summary Integration Tests with Mocked Prisma", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Mock a user login before each authenticated test.
   * No real user is created in the database.
   */
  beforeEach(async () => {
    console.log("\n========== SETTING UP MOCK TEST USER ==========");

    const hashedPassword = await bcrypt.hash("password123", 10);

    testUser = {
      id: "mock-wrapped-user-id",
      email: "wrappedtest@habitat.com",
      password: hashedPassword,
      username: "wrappedtester",
      firstName: "Wrapped",
      lastName: "Tester",
      isVerified: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(testUser);

    const loginRes = await request(app)
      .post("/login")
      .send({
        email: "wrappedtest@habitat.com",
        password: "password123",
      });

    token = loginRes.body.token;

    console.log("\n[AUTH SETUP]");
    console.log("EXPECTED: Login succeeds using mocked Prisma user");
    console.log("ACTUAL Login Status:", loginRes.status);
    console.log("JWT Token Received:", token ? "YES" : "NO");

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(mockPrisma.user.findUnique).toHaveBeenCalled();
  });

  /**
   * Tests successful weekly summary generation.
   */
  it("should successfully generate a Wrapped weekly summary without touching the database", async () => {
    console.log("\n========== TESTING WEEKLY SUMMARY GENERATION ==========");

    mockPrisma.weeklySummary.findUnique.mockResolvedValue(null);

    mockPrisma.habitCheckIn.findMany.mockResolvedValue([
      {
        id: "checkin-1",
        userId: testUser.id,
        habitId: "habit-1",
        date: new Date("2026-04-20"),
        completed: true,
        difficultyRating: 2,
        notes: "Felt good today",
      },
      {
        id: "checkin-2",
        userId: testUser.id,
        habitId: "habit-2",
        date: new Date("2026-04-21"),
        completed: true,
        difficultyRating: 3,
        notes: "A little harder but manageable",
      },
    ]);

    mockPrisma.weeklySummary.create.mockResolvedValue({
      id: "mock-summary-id",
      userId: testUser.id,
      weekKey: "2026-04-19",
      summary:
        "You maintained strong consistency this week and stayed on track with your habits.",
      refreshCount: 0,
    });

    const payload = {
      weekKey: "2026-04-19",
      recap: {
        weekStart: "2026-04-19T00:00:00.000Z",
        weekEnd: "2026-04-25T23:59:59.999Z",

        archetype: {
          animal: "Bear",
          title: "Steady Bear",
          description:
            "You maintained a steady rhythm throughout the week.",
        },

        scores: {
          completionScore: 0.85,
          consistencyScore: 0.8,
          streakScore: 0.7,
          reflectionScore: 0.6,
          activityScore: 0.75,
        },

        snapshots: {
          completionPulse: {
            title: "Completion Pulse",
            value: "85%",
            insight: "Strong completion this week",
          },

          categoryLeader: {
            title: "Category Leader",
            bestCategory: "Fitness",
            weakestCategory: "Sleep",
            insight: "Fitness led your week",
          },

          rhythmCheck: {
            title: "Rhythm Check",
            strongDays: 5,
            insight: "You stayed consistent",
          },

          moodBoard: {
            title: "Mood Board",
            label: "Easy",
            insight: "Habits felt manageable",
          },
        },

        weekItems: [
          {
            key: "sun",
            dayLabel: "Sun",
            shortLabel: "Sun",
            ratio: 0.8,
          },
          {
            key: "mon",
            dayLabel: "Mon",
            shortLabel: "Mon",
            ratio: 0.7,
          },
          {
            key: "tue",
            dayLabel: "Tue",
            shortLabel: "Tue",
            ratio: 0.9,
          },
          {
            key: "wed",
            dayLabel: "Wed",
            shortLabel: "Wed",
            ratio: 0.6,
          },
          {
            key: "thu",
            dayLabel: "Thu",
            shortLabel: "Thu",
            ratio: 0.75,
          },
          {
            key: "fri",
            dayLabel: "Fri",
            shortLabel: "Fri",
            ratio: 0.8,
          },
          {
            key: "sat",
            dayLabel: "Sat",
            shortLabel: "Sat",
            ratio: 0.9,
          },
        ],
      },
    };

    console.log("\n[WEEKLY SUMMARY TEST]");
    console.log("EXPECTED: Authenticated user receives weekly summary response");
    console.log("EXPECTED: No real Prisma database writes occur");
    console.log("EXPECTED: No real OpenAI API call occurs");

    const response = await request(app)
      .post("/ai/weekly-summary")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    console.log("ACTUAL Status:", response.status);
    console.log("ACTUAL Response Body:", response.body);

    expect(response.status).toBe(200);
    expect(response.body.summary).toBeDefined();
    expect(response.body.available).toBeDefined();

    expect(mockPrisma.weeklySummary.findUnique).toHaveBeenCalled();
    expect(mockPrisma.weeklySummary.create).toHaveBeenCalled();
  });

  /**
   * Tests unauthorized access protection.
   */
  it("should reject requests without authentication token", async () => {
    console.log("\n========== TESTING UNAUTHORIZED ACCESS ==========");

    const response = await request(app)
      .post("/ai/weekly-summary")
      .send({
        weekKey: "2026-04-19",
        recap: {},
      });

    console.log("\n[UNAUTHORIZED TEST]");
    console.log("EXPECTED Status: 401 or 403");
    console.log("ACTUAL Status:", response.status);

    expect([401, 403]).toContain(response.status);
  });
});