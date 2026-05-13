import { entityExists, hasComponent } from "bitecs";
import { describe, expect, test } from "vitest";

import {
  Body,
  createCreature,
  createFood,
  createSimulationWorld,
  destroyEntity,
  Energy,
  Health,
  Hunger,
  Position,
  Velocity,
} from "./index";

describe("core components", () => {
  test("creates a creature with all creature components and initial values", () => {
    const world = createSimulationWorld();

    const creature = createCreature(world, {
      position: { x: 2, y: 3 },
      velocity: { vx: 0.5, vy: -0.25 },
      body: { speed: 4, size: 1.5, sense_radius: 12 },
      health: { current: 80, max: 120 },
      hunger: { current: 10, max: 90, decay_rate: 0.75 },
      energy: { current: 40, max: 110, decay_rate: 0.5 },
    });

    expect(entityExists(world, creature)).toBe(true);
    expect(hasComponent(world, creature, Position)).toBe(true);
    expect(hasComponent(world, creature, Velocity)).toBe(true);
    expect(hasComponent(world, creature, Body)).toBe(true);
    expect(hasComponent(world, creature, Health)).toBe(true);
    expect(hasComponent(world, creature, Hunger)).toBe(true);
    expect(hasComponent(world, creature, Energy)).toBe(true);

    expect(Position.x[creature]).toBe(2);
    expect(Position.y[creature]).toBe(3);
    expect(Velocity.vx[creature]).toBe(0.5);
    expect(Velocity.vy[creature]).toBe(-0.25);
    expect(Body.speed[creature]).toBe(4);
    expect(Body.size[creature]).toBe(1.5);
    expect(Body.sense_radius[creature]).toBe(12);
    expect(Health.current[creature]).toBe(80);
    expect(Health.max[creature]).toBe(120);
    expect(Hunger.current[creature]).toBe(10);
    expect(Hunger.max[creature]).toBe(90);
    expect(Hunger.decay_rate[creature]).toBe(0.75);
    expect(Energy.current[creature]).toBe(40);
    expect(Energy.max[creature]).toBe(110);
    expect(Energy.decay_rate[creature]).toBe(0.5);
  });

  test("creates food with position, body, and energy only", () => {
    const world = createSimulationWorld();

    const food = createFood(world, {
      position: { x: -3, y: 7 },
      energy: { current: 15, max: 20, decay_rate: 0 },
    });

    expect(hasComponent(world, food, Position)).toBe(true);
    expect(hasComponent(world, food, Body)).toBe(true);
    expect(hasComponent(world, food, Energy)).toBe(true);
    expect(hasComponent(world, food, Velocity)).toBe(false);
    expect(hasComponent(world, food, Health)).toBe(false);
    expect(hasComponent(world, food, Hunger)).toBe(false);
    expect(Position.x[food]).toBe(-3);
    expect(Position.y[food]).toBe(7);
    expect(Body.speed[food]).toBe(0);
    expect(Energy.current[food]).toBe(15);
    expect(Energy.max[food]).toBe(20);
  });

  test("allows component data to be read and written by entity id", () => {
    const world = createSimulationWorld();
    const creature = createCreature(world);

    Position.x[creature] = 42;
    Velocity.vy[creature] = -2;
    Hunger.current[creature] = 33;

    expect(Position.x[creature]).toBe(42);
    expect(Velocity.vy[creature]).toBe(-2);
    expect(Hunger.current[creature]).toBe(33);
  });

  test("destroys entities and removes their component membership", () => {
    const world = createSimulationWorld();
    const creature = createCreature(world);

    destroyEntity(world, creature);

    expect(entityExists(world, creature)).toBe(false);
  });
});
