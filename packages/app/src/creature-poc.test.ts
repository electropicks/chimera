import { describe, expect, test } from "vitest";

import { collectCreaturePocFrames, createCreaturePocSimulation } from "./creature-poc";

const bounds = { width: 100, height: 100 } as const;

describe("createCreaturePocSimulation", () => {
  test("starts with a creature that can perceive food", () => {
    const simulation = createCreaturePocSimulation({ seed: 20260513, bounds });
    const snapshot = simulation.snapshot();

    expect(snapshot.foods.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.perception.nearestFood).not.toBeNull();
    expect(snapshot.creature.position).toEqual({ x: 20, y: 50 });
  });

  test("first action moves the creature toward visible food", () => {
    const simulation = createCreaturePocSimulation({ seed: 20260513, bounds });
    const before = simulation.snapshot();
    const after = simulation.step();

    expect(after.action).toBe("forage");
    expect(after.creature.position.x).toBeGreaterThan(before.creature.position.x);
    expect(after.creature.position.y).toBe(before.creature.position.y);
  });

  test("same seed produces the same action and position sequence", () => {
    const first = collectCreaturePocFrames({ seed: 42, bounds, frames: 32 });
    const second = collectCreaturePocFrames({ seed: 42, bounds, frames: 32 });

    expect(second).toEqual(first);
  });

  test("keeps the visible POC creature energized during the early demo loop", () => {
    const frames = collectCreaturePocFrames({ seed: 20260513, bounds, frames: 160 });
    const finalFrame = frames.at(-1);

    expect(finalFrame?.energy).toBeGreaterThan(20);
  });
});
