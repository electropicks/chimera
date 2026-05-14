import { describe, expect, test } from "vitest";

import { getSimulationStepsForFrame } from "./time-controls";

describe("getSimulationStepsForFrame", () => {
  test("returns zero steps while paused", () => {
    expect(getSimulationStepsForFrame({ frame: 5, framesPerTick: 5, speed: 0 })).toBe(0);
  });

  test("returns the selected speed on simulation tick frames", () => {
    expect(getSimulationStepsForFrame({ frame: 5, framesPerTick: 5, speed: 1 })).toBe(1);
    expect(getSimulationStepsForFrame({ frame: 5, framesPerTick: 5, speed: 4 })).toBe(4);
    expect(getSimulationStepsForFrame({ frame: 5, framesPerTick: 5, speed: 16 })).toBe(16);
  });

  test("returns zero steps between simulation tick frames", () => {
    expect(getSimulationStepsForFrame({ frame: 4, framesPerTick: 5, speed: 16 })).toBe(0);
  });
});
