const { generateHabits } = require("../../services/aiService");

// mock OpenAI
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify([
                    { name: "Exercise", category: "FITNESS" },
                  ]),
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

describe("generateHabits", () => {
  it("parses AI response correctly", async () => {
    const result = await generateHabits("get fit");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Exercise");
  });
});