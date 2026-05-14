import type { Perception } from "@creature/sim-core";
import {
  createCreature,
  createFood,
  createSimulationWorld,
  destroyEntity,
  snapshotWorld,
  type WorldSnapshot,
} from "@creature/sim-core";
import { describe, expect, test } from "vitest";
import { flee, forage, rest, runLeafBehavior, wander } from "./leaf-behaviors.ts";

function entity(snapshot: WorldSnapshot, id: number) {
  const found = snapshot.entities.find((current) => current.id === id);

  if (!found) {
    throw new Error(`Expected entity ${id} in snapshot`);
  }

  return found;
}

describe("leaf behaviors", () => {
  test("forage moves toward nearest food without mutating the input world", () => {
    const world = createSimulationWorld({ seed: 11 });
    const creature = createCreature(world, {
      position: { x: 10, y: 10 },
      body: { speed: 1, size: 1, sense_radius: 20 },
    });
    createFood(world, { position: { x: 14, y: 10 } });
    const before = snapshotWorld(world);

    const result = forage(world, creature);
    const movedCreature = entity(result.snapshot, result.entity);

    expect(snapshotWorld(world)).toEqual(before);
    expect(result.snapshot.tick).toBe(1);
    expect(movedCreature.position).toEqual({ x: 11, y: 10 });
    expect(movedCreature.velocity).toEqual({ vx: 1, vy: 0 });
  });

  test("foraging creature depletes adjacent food within one behavior tick", () => {
    const world = createSimulationWorld({ seed: 12 });
    const creature = createCreature(world, {
      position: { x: 10, y: 10 },
      body: { speed: 1, size: 1, sense_radius: 20 },
      hunger: { current: 30, max: 100, decay_rate: 1 },
    });
    const food = createFood(world, {
      position: { x: 11, y: 10 },
      energy: { current: 25, max: 25, decay_rate: 0 },
    });

    const result = forage(world, creature);
    const fedCreature = entity(result.snapshot, result.entity);
    const depletedFood = entity(result.snapshot, food);

    expect(snapshotWorld(world).entities.some((current) => current.id === food)).toBe(true);
    expect(depletedFood.resource?.current).toBe(0);
    expect(fedCreature.hunger?.current).toBe(6);
  });

  test("rest stops movement and regenerates energy at triple decay rate", () => {
    const world = createSimulationWorld({ seed: 13 });
    const creature = createCreature(world, {
      position: { x: 10, y: 10 },
      velocity: { vx: 1, vy: 0 },
      energy: { current: 20, max: 100, decay_rate: 2 },
    });

    const result = rest(world, creature);
    const restedCreature = entity(result.snapshot, result.entity);

    expect(restedCreature.position).toEqual({ x: 10, y: 10 });
    expect(restedCreature.velocity).toEqual({ vx: 0, vy: 0 });
    expect(restedCreature.energy?.current).toBe(26);
    expect(
      snapshotWorld(world).entities.find((current) => current.id === creature)?.energy?.current,
    ).toBe(20);
  });

  test("wander is deterministic for the same seed, tick, and entity", () => {
    const world = createSimulationWorld({ seed: 14 });
    const creature = createCreature(world, {
      position: { x: 20, y: 20 },
      body: { speed: 1, size: 1, sense_radius: 20 },
    });

    const first = wander(world, creature);
    const second = wander(world, creature);

    expect(second.snapshot).toEqual(first.snapshot);
    expect(entity(first.snapshot, first.entity).position).not.toEqual({ x: 20, y: 20 });
  });

  test("flee moves opposite a perceived threat when one is present", () => {
    const world = createSimulationWorld({ seed: 15 });
    const creature = createCreature(world, {
      position: { x: 10, y: 10 },
      body: { speed: 1, size: 1, sense_radius: 20 },
    });
    const perception: Perception = {
      entity: creature,
      senseRadius: 20,
      visibleEntities: [],
      nearestFood: null,
      nearestThreat: { entity: 99, distance: 2, direction: { x: 1, y: 0 } },
      nearestCreature: null,
      vitals: {
        hunger: { current: 0, max: 100 },
        energy: { current: 100, max: 100 },
        health: { current: 100, max: 100 },
      },
      localObstacleDensity: 0,
    };

    const result = flee(world, creature, { perception });
    const fleeingCreature = entity(result.snapshot, result.entity);

    expect(fleeingCreature.position).toEqual({ x: 9, y: 10 });
    expect(fleeingCreature.velocity).toEqual({ vx: -1, vy: 0 });
  });

  test("dispatcher passes decision perception through to flee", () => {
    const world = createSimulationWorld({ seed: 16 });
    const creature = createCreature(world, {
      position: { x: 10, y: 10 },
      body: { speed: 1, size: 1, sense_radius: 20 },
    });
    const perception: Perception = {
      entity: creature,
      senseRadius: 20,
      visibleEntities: [],
      nearestFood: null,
      nearestThreat: { entity: 99, distance: 2, direction: { x: 1, y: 0 } },
      nearestCreature: null,
      vitals: {
        hunger: { current: 0, max: 100 },
        energy: { current: 100, max: 100 },
        health: { current: 100, max: 100 },
      },
      localObstacleDensity: 0,
    };

    const result = runLeafBehavior(world, creature, "flee", { perception });
    const fleeingCreature = entity(result.snapshot, result.entity);

    expect(fleeingCreature.position).toEqual({ x: 9, y: 10 });
    expect(fleeingCreature.velocity).toEqual({ vx: -1, vy: 0 });
  });

  test("pure behavior clones preserve surviving entity ids after removals", () => {
    const world = createSimulationWorld({ seed: 17 });
    const creature = createCreature(world, {
      position: { x: 10, y: 10 },
    });
    const removedFood = createFood(world, { position: { x: 11, y: 10 } });
    const survivingFood = createFood(world, { position: { x: 20, y: 10 } });
    destroyEntity(world, removedFood);

    const result = rest(world, creature);
    const resultIds = result.snapshot.entities.map((current) => current.id);

    expect(result.entity).toBe(creature);
    expect(resultIds).toContain(creature);
    expect(resultIds).toContain(survivingFood);
    expect(resultIds).not.toContain(removedFood);
  });
});
