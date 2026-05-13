import { describe, expect, test } from "vitest";

import {
  createCreature,
  createFood,
  createSimulationWorld,
  getCoreComponents,
  SYSTEM_ORDER,
  snapshotWorld,
  step,
} from "./index";

describe("step", () => {
  test("advances exactly one tick and runs systems in fixed order", () => {
    const world = createSimulationWorld({ bounds: { maxX: 10, maxY: 10 } });
    const creature = createCreature(world, {
      position: { x: 1, y: 1 },
      velocity: { vx: 0, vy: 0 },
      body: { speed: 2 },
      hunger: { current: 0, max: 10, decay_rate: 0.5 },
      energy: { current: 10, max: 10, decay_rate: 0.25 },
    });

    const nextWorld = step(world, {
      type: "set_velocity",
      entity: creature,
      velocity: { vx: 3, vy: 0 },
    });
    const components = getCoreComponents(nextWorld);

    expect(nextWorld).toBe(world);
    expect(world.sim.tick).toBe(1);
    expect(world.sim.lastSystemOrder).toEqual(SYSTEM_ORDER);
    expect(components.Velocity.vx[creature]).toBe(2);
    expect(components.Position.x[creature]).toBe(3);
    expect(components.Hunger.current[creature]).toBe(0.5);
    expect(components.Energy.current[creature]).toBe(9.75);
    expect(world.sim.events).toEqual([
      {
        type: "tick_completed",
        tick: 1,
        systems: SYSTEM_ORDER,
      },
    ]);
  });

  test("keeps dev invariants true after clamping physics and needs decay", () => {
    const world = createSimulationWorld({ bounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 } });
    const creature = createCreature(world, {
      position: { x: 0, y: 0 },
      body: { speed: 10 },
      energy: { current: 0.5, max: 10, decay_rate: 4 },
    });

    step(world, {
      type: "set_velocity",
      entity: creature,
      velocity: { vx: 10, vy: 10 },
    });

    const components = getCoreComponents(world);
    expect(components.Position.x[creature]).toBe(1);
    expect(components.Position.y[creature]).toBe(1);
    expect(components.Energy.current[creature]).toBe(0);
    expect(world.sim.events[0]).toEqual({
      type: "vital_depleted",
      tick: 1,
      entity: creature,
      vital: "energy",
    });
  });

  test("100-tick run with seed 42 produces a byte-identical world snapshot", () => {
    const firstSnapshot = runSeed42Scenario();
    const secondSnapshot = runSeed42Scenario();

    expect(secondSnapshot).toBe(firstSnapshot);
    expect(firstSnapshot).toMatchInlineSnapshot(
      `"{"tick":100,"seed":42,"bounds":{"minX":-5,"minY":-5,"maxX":5,"maxY":5},"entities":[{"id":1,"position":{"x":-2,"y":1},"velocity":{"vx":0,"vy":-0.25},"body":{"speed":1.25,"size":1,"sense_radius":6},"health":{"current":90,"max":100},"hunger":{"current":13.5,"max":100,"decay_rate":0.125},"energy":{"current":55,"max":100,"decay_rate":0.25}},{"id":2,"position":{"x":3,"y":-1},"body":{"speed":0,"size":0.5,"sense_radius":0},"energy":{"current":15,"max":15,"decay_rate":0}}],"events":[{"type":"tick_completed","tick":100,"systems":["perception","decision","action","physics","needs_decay","events"]}],"lastSystemOrder":["perception","decision","action","physics","needs_decay","events"]}"`,
    );
  });
});

function runSeed42Scenario(): string {
  const world = createSimulationWorld({
    seed: 42,
    bounds: { minX: -5, minY: -5, maxX: 5, maxY: 5 },
  });
  const creature = createCreature(world, {
    position: { x: -2, y: 1 },
    velocity: { vx: 0.25, vy: -0.5 },
    body: { speed: 1.25, size: 1, sense_radius: 6 },
    health: { current: 90, max: 100 },
    hunger: { current: 1, max: 100, decay_rate: 0.125 },
    energy: { current: 80, max: 100, decay_rate: 0.25 },
  });

  createFood(world, {
    position: { x: 3, y: -1 },
    energy: { current: 15, max: 15, decay_rate: 0 },
  });

  for (let tick = 0; tick < 100; tick += 1) {
    const direction = tick % 4;
    step(world, {
      type: "set_velocity",
      entity: creature,
      velocity: {
        vx: direction === 0 ? 0.5 : direction === 2 ? -0.5 : 0,
        vy: direction === 1 ? 0.25 : direction === 3 ? -0.25 : 0,
      },
    });
  }

  return JSON.stringify(snapshotWorld(world));
}
