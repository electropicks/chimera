import { describe, expect, test } from "vitest";

import {
  consumeResource,
  createCreature,
  createFood,
  createSimulationWorld,
  type EntitySnapshot,
  perceive,
  snapshotWorld,
  step,
} from "./index";

describe("resource system", () => {
  test("creates food with resource nutrition and regrowth state", () => {
    const world = createSimulationWorld();
    const food = createFood(world, {
      position: { x: 3, y: 4 },
      resource: { nutrition: 18, regrow_ticks: 7 },
    });

    expect(entity(snapshotWorld(world), food).resource).toEqual({
      current: 18,
      max: 18,
      nutrition: 18,
      regrow_ticks: 7,
      regrow_remaining: 0,
    });
  });

  test("eating reduces hunger and depletes the resource without destroying the food entity", () => {
    const world = createSimulationWorld();
    const creature = createCreature(world, {
      body: { sense_radius: 10 },
      hunger: { current: 20, max: 100, decay_rate: 0 },
      position: { x: 0, y: 0 },
    });
    const food = createFood(world, {
      position: { x: 1, y: 0 },
      resource: { nutrition: 12, regrow_ticks: 3 },
    });

    const result = consumeResource(world, { consumer: creature, resource: food });
    const snapshot = snapshotWorld(world);

    expect(result).toEqual({ consumedNutrition: 12, depleted: true });
    expect(entity(snapshot, creature).hunger?.current).toBe(8);
    expect(entity(snapshot, food).resource).toMatchObject({
      current: 0,
      regrow_remaining: 3,
    });
    expect(snapshot.entities.map((current) => current.id)).toContain(food);
    expect(perceive(world, creature).nearestFood).toBeNull();
  });

  test("depleted resources regrow after their configured tick count", () => {
    const world = createSimulationWorld();
    const creature = createCreature(world, {
      hunger: { current: 30, max: 100, decay_rate: 0 },
    });
    const food = createFood(world, {
      resource: { nutrition: 9, regrow_ticks: 2 },
    });

    consumeResource(world, { consumer: creature, resource: food });
    step(world, null);

    expect(entity(snapshotWorld(world), food).resource).toMatchObject({
      current: 0,
      regrow_remaining: 1,
    });

    step(world, null);

    expect(entity(snapshotWorld(world), food).resource).toMatchObject({
      current: 9,
      regrow_remaining: 0,
    });
  });

  test("keeps active food resources within configured density bounds over a long run", () => {
    const world = createSimulationWorld({
      seed: 15,
      worldSeed: 515,
      resources: {
        foodNutrition: 11,
        maxFoodCount: 12,
        regrowTicks: 9,
        spawnBatchSize: 3,
        targetFoodCount: 6,
      },
    });
    const creature = createCreature(world, {
      hunger: { current: 80, max: 100, decay_rate: 0 },
    });
    const activeCounts: number[] = [];

    for (let tick = 0; tick < 10_000; tick += 1) {
      step(world, null);

      const activeFood = activeFoodEntities(snapshotWorld(world));
      activeCounts.push(activeFood.length);

      if (tick % 11 === 0 && activeFood[0] !== undefined) {
        consumeResource(world, { consumer: creature, resource: activeFood[0] });
      }
    }

    const steadyStateCounts = activeCounts.slice(50);

    expect(Math.min(...steadyStateCounts)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...steadyStateCounts)).toBeLessThanOrEqual(12);
  });

  test("uses worldSeed for deterministic resource spawn positions", () => {
    const firstWorld = createSimulationWorld({
      seed: 1,
      worldSeed: 42,
      resources: { targetFoodCount: 4 },
    });
    const secondWorld = createSimulationWorld({
      seed: 999,
      worldSeed: 42,
      resources: { targetFoodCount: 4 },
    });
    const differentWorld = createSimulationWorld({
      seed: 1,
      worldSeed: 43,
      resources: { targetFoodCount: 4 },
    });

    step(firstWorld, null);
    step(secondWorld, null);
    step(differentWorld, null);

    expect(foodPositions(secondWorld)).toEqual(foodPositions(firstWorld));
    expect(foodPositions(differentWorld)).not.toEqual(foodPositions(firstWorld));
  });
});

function entity(snapshot: ReturnType<typeof snapshotWorld>, id: number): EntitySnapshot {
  const found = snapshot.entities.find((current) => current.id === id);

  if (!found) {
    throw new Error(`missing entity ${id}`);
  }

  return found;
}

function activeFoodEntities(snapshot: ReturnType<typeof snapshotWorld>): number[] {
  return snapshot.entities
    .filter((current) => current.resource && current.resource.current > 0)
    .map((current) => current.id);
}

function foodPositions(
  snapshotOrWorld: ReturnType<typeof snapshotWorld> | Parameters<typeof snapshotWorld>[0],
) {
  const snapshot = "entities" in snapshotOrWorld ? snapshotOrWorld : snapshotWorld(snapshotOrWorld);

  return snapshot.entities
    .filter((current) => current.resource && current.resource.current > 0)
    .map((current) => current.position);
}
