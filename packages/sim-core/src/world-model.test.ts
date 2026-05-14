import { describe, expect, test } from "vitest";

import {
  createCreature,
  createSimulationWorld,
  generateWorldModel,
  getCoreComponents,
  snapshotWorld,
  step,
} from "./index";

describe("world model", () => {
  test("stores bounded world geometry and obstacle rectangles in snapshots", () => {
    const world = createSimulationWorld({
      bounds: { minX: -10, minY: -5, maxX: 40, maxY: 20 },
      obstacles: [{ id: "rock-1", minX: 3, minY: 4, maxX: 8, maxY: 12 }],
      seed: 11,
      worldSeed: 101,
    });

    expect(snapshotWorld(world)).toMatchObject({
      seed: 11,
      worldSeed: 101,
      bounds: { minX: -10, minY: -5, maxX: 40, maxY: 20 },
      obstacles: [{ id: "rock-1", minX: 3, minY: 4, maxX: 8, maxY: 12 }],
    });
  });

  test("blocks creature movement into obstacle rectangles", () => {
    const world = createSimulationWorld({
      obstacles: [{ id: "wall", minX: 2, minY: 0, maxX: 4, maxY: 4 }],
    });
    const creature = createCreature(world, {
      body: { speed: 5 },
      energy: { decay_rate: 0 },
      position: { x: 1, y: 2 },
    });

    step(world, {
      type: "set_velocity",
      entity: creature,
      velocity: { vx: 2, vy: 0 },
    });

    const components = getCoreComponents(world);
    expect(components.Position.x[creature]).toBe(1);
    expect(components.Position.y[creature]).toBe(2);
    expect(components.Velocity.vx[creature]).toBe(0);
    expect(components.Velocity.vy[creature]).toBe(0);
  });

  test("blocks high-speed movement that would cross an obstacle between ticks", () => {
    const world = createSimulationWorld({
      obstacles: [{ id: "barrier", minX: 3, minY: 0, maxX: 5, maxY: 4 }],
    });
    const creature = createCreature(world, {
      body: { speed: 10 },
      energy: { decay_rate: 0 },
      position: { x: 1, y: 2 },
    });

    step(world, {
      type: "set_velocity",
      entity: creature,
      velocity: { vx: 8, vy: 0 },
    });

    const components = getCoreComponents(world);
    expect(components.Position.x[creature]).toBe(1);
    expect(components.Position.y[creature]).toBe(2);
  });

  test("generates procedural obstacles from worldSeed independently of sim seed", () => {
    const firstModel = generateWorldModel({
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      obstacleCount: 4,
      worldSeed: 42,
    });
    const secondModel = generateWorldModel({
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      obstacleCount: 4,
      worldSeed: 42,
    });
    const differentModel = generateWorldModel({
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      obstacleCount: 4,
      worldSeed: 43,
    });

    expect(secondModel).toEqual(firstModel);
    expect(differentModel.obstacles).not.toEqual(firstModel.obstacles);

    const firstWorld = createSimulationWorld({ ...firstModel, seed: 1 });
    const secondWorld = createSimulationWorld({ ...firstModel, seed: 999 });

    expect(snapshotWorld(firstWorld).seed).toBe(1);
    expect(snapshotWorld(secondWorld).seed).toBe(999);
    expect(snapshotWorld(secondWorld).worldSeed).toBe(snapshotWorld(firstWorld).worldSeed);
    expect(snapshotWorld(secondWorld).obstacles).toEqual(snapshotWorld(firstWorld).obstacles);
  });
});
