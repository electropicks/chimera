import type { Perception } from "@creature/sim-core";
import { describe, expect, test } from "vitest";
import { decide, defaultUtilityPolicy, scoreUtilityActions } from "./behavior.ts";

function perception(overrides: Partial<Perception> = {}): Perception {
  return {
    entity: 1,
    senseRadius: 10,
    visibleEntities: [],
    nearestFood: null,
    nearestThreat: null,
    nearestCreature: null,
    vitals: {
      hunger: { current: 0, max: 100 },
      energy: { current: 100, max: 100 },
      health: { current: 100, max: 100 },
    },
    localObstacleDensity: 0,
    ...overrides,
  };
}

describe("utility arbitration", () => {
  test("hungry creature near food scores forage highest", () => {
    const hungryNearFood = perception({
      nearestFood: { entity: 2, distance: 1, direction: { x: 1, y: 0 } },
      vitals: {
        hunger: { current: 95, max: 100 },
        energy: { current: 70, max: 100 },
        health: { current: 100, max: 100 },
      },
    });

    const scores = scoreUtilityActions(hungryNearFood, defaultUtilityPolicy);
    const decision = decide(hungryNearFood, defaultUtilityPolicy);

    expect(scores.forage).toBeGreaterThan(scores.rest);
    expect(scores.forage).toBeGreaterThan(scores.wander);
    expect(scores.forage).toBeGreaterThan(scores.flee);
    expect(decision.action).toBe("forage");
    expect(decision.scores).toEqual(scores);
    expect(decision.reason).toContain("forage");
  });

  test("tired creature scores rest highest", () => {
    const tired = perception({
      vitals: {
        hunger: { current: 20, max: 100 },
        energy: { current: 8, max: 100 },
        health: { current: 100, max: 100 },
      },
    });

    const scores = scoreUtilityActions(tired, defaultUtilityPolicy);
    const decision = decide(tired, defaultUtilityPolicy);

    expect(scores.rest).toBeGreaterThan(scores.forage);
    expect(scores.rest).toBeGreaterThan(scores.wander);
    expect(scores.rest).toBeGreaterThan(scores.flee);
    expect(decision.action).toBe("rest");
  });

  test("threatened creature scores flee highest", () => {
    const threatened = perception({
      nearestThreat: { entity: 9, distance: 2, direction: { x: -1, y: 0 } },
      vitals: {
        hunger: { current: 85, max: 100 },
        energy: { current: 80, max: 100 },
        health: { current: 100, max: 100 },
      },
    });

    const scores = scoreUtilityActions(threatened, defaultUtilityPolicy);
    const decision = decide(threatened, defaultUtilityPolicy);

    expect(scores.flee).toBeGreaterThan(scores.forage);
    expect(scores.flee).toBeGreaterThan(scores.rest);
    expect(scores.flee).toBeGreaterThan(scores.wander);
    expect(decision.action).toBe("flee");
  });
});
