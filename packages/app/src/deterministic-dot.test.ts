import { describe, expect, test } from "vitest";

import { collectDotPixels, createDeterministicDotSimulation } from "./deterministic-dot";

const bounds = { width: 320, height: 180 } as const;

describe("createDeterministicDotSimulation", () => {
  test("produces the same pixel path for the same seed", () => {
    const firstPath = collectDotPixels(20260513, 240, bounds);
    const secondPath = collectDotPixels(20260513, 240, bounds);

    expect(secondPath).toEqual(firstPath);
  });

  test("changes the pixel path when the seed changes", () => {
    const firstPath = collectDotPixels(1, 30, bounds);
    const secondPath = collectDotPixels(2, 30, bounds);

    expect(secondPath).not.toEqual(firstPath);
  });

  test("keeps the dot inside the drawable area", () => {
    const simulation = createDeterministicDotSimulation({ seed: 7, bounds });
    const pixels = Array.from({ length: 1_000 }, () => simulation.step().pixel);

    expect(pixels.every((pixel) => pixel.x >= 8 && pixel.x <= bounds.width - 8)).toBe(true);
    expect(pixels.every((pixel) => pixel.y >= 8 && pixel.y <= bounds.height - 8)).toBe(true);
  });

  test("keeps the dot inside updated bounds after resize", () => {
    const simulation = createDeterministicDotSimulation({
      seed: 7,
      bounds: { width: 1_280, height: 720 },
    });
    const resizedBounds = { width: 320, height: 180 } as const;
    const pixels = Array.from({ length: 1_000 }, () => simulation.step(resizedBounds).pixel);

    expect(pixels.every((pixel) => pixel.x >= 8 && pixel.x <= resizedBounds.width - 8)).toBe(true);
    expect(pixels.every((pixel) => pixel.y >= 8 && pixel.y <= resizedBounds.height - 8)).toBe(true);
  });
});
