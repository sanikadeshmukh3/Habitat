const request = require("supertest");
const app = require("../../server"); // your express app
const { generateHabits } = require("../../services/aiService");

jest.mock("../../services/aiService");

jest.spyOn(console, "error").mockImplementation(() => {});
describe("POST /ai/generate-habits", () => {
  it("returns AI-generated habits", async () => {
    generateHabits.mockResolvedValue([
      {
        name: "Drink water",
        category: "WELLNESS",
      },
    ]);

    const res = await request(app)
      .post("/ai/generate-habits")
      .send({ goal: "stay healthy" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Drink water");
  });

  it("handles errors properly", async () => {
    generateHabits.mockRejectedValue(new Error("AI failed"));

    const res = await request(app)
      .post("/ai/generate-habits")
      .send({ goal: "test" });

    expect(res.statusCode).toBe(500);
  });
});