import type { TimeControlSpeed } from "@creature/ui";

export interface SimulationStepFrameOptions {
  readonly frame: number;
  readonly framesPerTick: number;
  readonly speed: TimeControlSpeed;
}

export function getSimulationStepsForFrame({
  frame,
  framesPerTick,
  speed,
}: SimulationStepFrameOptions): number {
  if (speed === 0 || frame % framesPerTick !== 0) {
    return 0;
  }

  return speed;
}
