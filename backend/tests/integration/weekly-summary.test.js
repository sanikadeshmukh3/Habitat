/**
 * Wrapped Weekly Summary Integration Test
 *
 * Tests Habitat's Wrapped AI summary backend endpoint.
 *
 * This integration test verifies:
 * 1. A user can authenticate successfully
 * 2. A valid recap payload can be sent to the weekly summary endpoint
 * 3. The backend returns an AI-generated summary
 * 4. Unauthorized users cannot access the endpoint
 *
 * TECHNOLOGIES:
 * - Jest
 * - Supertest
 * - Prisma Test DB
 */

const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../../server");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

let token;
let testUser;

describe("Habitat Wrapped Weekly Summary Integration Tests", () => {

  /**
   * Runs before all tests
   * Creates a temporary test user
   * Logs in user to retrieve authentication token
   */
  beforeAll(async () => {
    console.log("\n========== SETTING UP TEST USER ==========");

    // Remove old duplicate test user
    await prisma.user.deleteMany({
      where: {
        email: "wrappedtest@habitat.com"
      }
    });

    const hashedPassword = await bcrypt.hash("password123", 10);

    testUser = await prisma.user.create({
        data: {
            email: "wrappedtest@habitat.com",
            password: hashedPassword,
            username: "wrappedtester",
            firstName: "Wrapped",
            lastName: "Tester",
            isVerified: true,
        },
    });

    console.log("Test user created:");
    console.log(testUser);

    const loginRes = await request(app)
      .post("/login")
      .send({
        email: "wrappedtest@habitat.com",
        password: "password123"
      });

    token = loginRes.body.token;

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    console.log("\nExpected Login Status: 200");
    console.log("Actual Login Status:", loginRes.status);
    console.log("JWT Token Received:", token ? "YES" : "NO");
  });

  /**
   * Cleanup after all tests finish
   */
  afterAll(async () => {
    console.log("\n========== CLEANING UP TEST DATA ==========");

    await prisma.weeklySummary.deleteMany({
      where: {
        userId: testUser.id
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: "wrappedtest@habitat.com"
      }
    });

    console.log("Test user deleted successfully");

    await prisma.$disconnect();
  });

  /**
   * Tests successful weekly summary generation
   */
  it("should successfully generate a Wrapped weekly summary", async () => {
    console.log("\n========== TESTING WEEKLY SUMMARY GENERATION ==========");

    const payload = {
      weekKey: "2026-04-19",
      recap: {
        weekStart: "2026-04-19T00:00:00.000Z",
        weekEnd: "2026-04-25T23:59:59.999Z",

        archetype: {
          animal: "Bear",
          title: "Steady Bear",
          description:
            "You maintained a steady rhythm throughout the week."
        },

        scores: {
          completionScore: 0.85,
          consistencyScore: 0.80,
          streakScore: 0.70,
          reflectionScore: 0.60,
          activityScore: 0.75
        }
      }
    };

    console.log("Sending recap payload:");
    console.log(JSON.stringify(payload, null, 2));

    const response = await request(app)
      .post("/ai/weekly-summary")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    console.log("\nExpected Status: 200");
    console.log("Actual Status:", response.status);

    console.log("\nExpected Response:");
    console.log("- summary");
    console.log("- available");
    console.log("- refreshCount");

    console.log("\nActual Response Body:");
    console.log(response.body);

    expect(response.status).toBe(200);
    expect(response.body.summary).toBeDefined();
    expect(response.body.available).toBeDefined();
  });

  /**
   * Tests unauthorized access protection
   */
  it("should reject requests without authentication token", async () => {
    console.log("\n========== TESTING UNAUTHORIZED ACCESS ==========");

    const response = await request(app)
      .post("/ai/weekly-summary")
      .send({
        weekKey: "2026-04-19",
        recap: {}
      });

    console.log("Expected Status: 401 or 403");
    console.log("Actual Status:", response.status);

    expect([401, 403]).toContain(response.status);
  });
});