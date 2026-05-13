import { describe, expect, test } from "vitest";

import {
  createCreature,
  createFood,
  createSimulationWorld,
  PERCEPTION_FEATURE_ORDER,
  PERCEPTION_FEATURE_VERSION,
  perceive,
  perceptionToFeatureVector,
} from "./index";

describe("perceive", () => {
  test("returns visible entities within the observer sense radius with nearest food and creature", () => {
    const world = createSimulationWorld();
    const observer = createCreature(world, {
      position: { x: 0, y: 0 },
      body: { sense_radius: 10 },
      health: { current: 75, max: 100 },
      hunger: { current: 30, max: 120, decay_rate: 1 },
      energy: { current: 40, max: 80, decay_rate: 1 },
    });
    const nearFood = createFood(world, {
      position: { x: 3, y: 4 },
    });
    const farFood = createFood(world, {
      position: { x: 11, y: 0 },
    });
    const nearCreature = createCreature(world, {
      position: { x: 0, y: -6 },
    });

    const perception = perceive(world, observer);

    expect(perception.entity).toBe(observer);
    expect(perception.senseRadius).toBe(10);
    expect(perception.visibleEntities.map((entity) => entity.entity)).toEqual([
      nearFood,
      nearCreature,
    ]);
    expect(perception.visibleEntities.map((entity) => entity.kind)).toEqual(["food", "creature"]);
    expect(perception.nearestFood).toEqual({
      entity: nearFood,
      distance: 5,
      direction: { x: 0.6, y: 0.8 },
    });
    expect(perception.nearestCreature).toEqual({
      entity: nearCreature,
      distance: 6,
      direction: { x: 0, y: -1 },
    });
    expect(perception.nearestThreat).toBeNull();
    expect(perception.vitals).toEqual({
      hunger: { current: 30, max: 120 },
      energy: { current: 40, max: 80 },
      health: { current: 75, max: 100 },
    });
    expect(perception.localObstacleDensity).toBe(0);
    expect(perception.visibleEntities.some((entity) => entity.entity === farFood)).toBe(false);
  });

  test("uses entity id order to break equal-distance ties deterministically", () => {
    const world = createSimulationWorld();
    const observer = createCreature(world, {
      position: { x: 0, y: 0 },
      body: { sense_radius: 5 },
    });
    const firstFood = createFood(world, {
      position: { x: 3, y: 0 },
    });
    createFood(world, {
      position: { x: 0, y: 3 },
    });

    const firstPerception = perceive(world, observer);
    const secondPerception = perceive(world, observer);

    expect(secondPerception).toEqual(firstPerception);
    expect(firstPerception.nearestFood?.entity).toBe(firstFood);
    expect(firstPerception.nearestFood?.distance).toBe(3);
  });
});

describe("perceptionToFeatureVector", () => {
  test("returns a fixed-length normalized vector for neural input", () => {
    const world = createSimulationWorld();
    const observer = createCreature(world, {
      position: { x: 0, y: 0 },
      body: { sense_radius: 10 },
      health: { current: 25, max: 100 },
      hunger: { current: 50, max: 100, decay_rate: 1 },
      energy: { current: 75, max: 100, decay_rate: 1 },
    });
    createFood(world, {
      position: { x: 6, y: 8 },
    });
    createCreature(world, {
      position: { x: -5, y: 0 },
    });

    const vector = perceptionToFeatureVector(perceive(world, observer));

    expect(PERCEPTION_FEATURE_VERSION).toBe(1);
    expect(PERCEPTION_FEATURE_ORDER).toEqual([
      "hunger",
      "energy",
      "health",
      "nearest_food_present",
      "nearest_food_distance",
      "nearest_food_direction_x",
      "nearest_food_direction_y",
      "nearest_threat_present",
      "nearest_threat_distance",
      "nearest_threat_direction_x",
      "nearest_threat_direction_y",
      "nearest_creature_present",
      "nearest_creature_distance",
      "nearest_creature_direction_x",
      "nearest_creature_direction_y",
      "local_obstacle_density",
    ]);
    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector).toHaveLength(PERCEPTION_FEATURE_ORDER.length);
    expectVectorCloseTo(vector, [0.5, 0.75, 0.25, 1, 1, 0.6, 0.8, 0, 1, 0, 0, 1, 0.5, -1, 0, 0]);
  });
});

function expectVectorCloseTo(received: Float32Array, expected: number[]): void {
  expect(Array.from(received)).toHaveLength(expected.length);

  for (const [index, value] of received.entries()) {
    expect(value).toBeCloseTo(expected[index] ?? 0, 6);
  }
}
