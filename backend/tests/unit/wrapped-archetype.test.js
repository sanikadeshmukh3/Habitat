/**
 * Wrapped Archetype Unit Test
 *
 * Tests Habitat's Wrapped animal archetype logic.
 *
 * This unit test verifies:
 * 1. Strong users receive a strong archetype
 * 2. Average users receive an average archetype
 * 3. Weak users receive a weak archetype
 * 4. The fallback/default animal logic works correctly
 *
 * TECHNOLOGIES:
 * - Jest
 *
 * NOTE:
 * Update the import path below to match where your actual archetype function lives.
 */

const { determineArchetype } = require("../../lib/archetypes");

describe("Habitat Wrapped Archetype Unit Tests", () => {
  /**
   * Strong performance test
   */
  it("should return Wolf for a highly consistent high-performing user", () => {
    console.log("\n========== TESTING STRONG ARCHETYPE: WOLF ==========");

    const metrics = {
      completionScore: 0.92,
      consistencyScore: 0.88,
      streakScore: 0.82,
      activityScore: 0.85,
      reflectionScore: 0.4,
      dailyVariance: 0.15,
      recoveryScore: 0.7,
    };

    console.log("Input Metrics:");
    console.log(metrics);

    const result = determineArchetype(metrics);

    console.log("Expected Animal: Wolf");
    console.log("Actual Animal:", result.animal);
    console.log("Full Result:", result);

    expect(result.animal).toBe("Wolf");
    expect(result.tier).toBe("strong");
  });

  /**
   * Strong default/fallback test
   */
  it("should return Bear as the default strong archetype", () => {
    console.log("\n========== TESTING STRONG DEFAULT ARCHETYPE: BEAR ==========");

    const metrics = {
      completionScore: 0.76,
      consistencyScore: 0.70,
      streakScore: 0.45,
      activityScore: 0.55,
      reflectionScore: 0.2,
      dailyVariance: 0.35,
      recoveryScore: 0.5,
    };

    console.log("Input Metrics:");
    console.log(metrics);

    const result = determineArchetype(metrics);

    console.log("Expected Animal: Bear");
    console.log("Actual Animal:", result.animal);
    console.log("Full Result:", result);

    expect(result.animal).toBe("Bear");
    expect(result.tier).toBe("strong");
  });

  /**
   * Average default/fallback test
   */
  it("should return Monkey as the default average archetype", () => {
    console.log("\n========== TESTING AVERAGE DEFAULT ARCHETYPE: MONKEY ==========");

    const metrics = {
      completionScore: 0.58,
      consistencyScore: 0.50,
      streakScore: 0.35,
      activityScore: 0.45,
      reflectionScore: 0.25,
      dailyVariance: 0.45,
      recoveryScore: 0.5,
    };

    console.log("Input Metrics:");
    console.log(metrics);

    const result = determineArchetype(metrics);

    console.log("Expected Animal: Monkey");
    console.log("Actual Animal:", result.animal);
    console.log("Full Result:", result);

    expect(result.animal).toBe("Monkey");
    expect(result.tier).toBe("average");
  });

  /**
   * Weak default/fallback test
   */
  it("should return Sloth as the default weak archetype", () => {
    console.log("\n========== TESTING WEAK DEFAULT ARCHETYPE: SLOTH ==========");

    const metrics = {
      completionScore: 0.25,
      consistencyScore: 0.20,
      streakScore: 0.10,
      activityScore: 0.20,
      reflectionScore: 0.1,
      dailyVariance: 0.6,
      recoveryScore: 0.2,
    };

    console.log("Input Metrics:");
    console.log(metrics);

    const result = determineArchetype(metrics);

    console.log("Expected Animal: Sloth");
    console.log("Actual Animal:", result.animal);
    console.log("Full Result:", result);

    expect(result.animal).toBe("Sloth");
    expect(result.tier).toBe("weak");
  });
});