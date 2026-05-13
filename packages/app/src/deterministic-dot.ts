import { createRng } from "@creature/sim-core";

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Velocity {
  readonly x: number;
  readonly y: number;
}

export interface DotEntity {
  readonly id: "phase-0-dot";
  readonly position: Position;
  readonly velocity: Velocity;
}

export interface DotBounds {
  readonly width: number;
  readonly height: number;
}

export interface DotSimulationOptions {
  readonly seed: number;
  readonly bounds: DotBounds;
}

export interface DotSnapshot {
  readonly frame: number;
  readonly entity: DotEntity;
  readonly pixel: Position;
}

const DOT_RADIUS_PIXELS = 8;
const FIXED_TIMESTEP_SECONDS = 1 / 60;
const MIN_SPEED_PIXELS_PER_SECOND = 72;
const MAX_SPEED_PIXELS_PER_SECOND = 128;
const TWO_PI = Math.PI * 2;

export function createDeterministicDotSimulation({
  seed,
  bounds,
}: DotSimulationOptions): DotSimulation {
  const rng = createRng(seed);
  const spawnBounds = clampBounds(bounds);
  const heading = rng.range(0, TWO_PI);
  const speed = rng.range(MIN_SPEED_PIXELS_PER_SECOND, MAX_SPEED_PIXELS_PER_SECOND);
  let frame = 0;
  let entity: DotEntity = {
    id: "phase-0-dot",
    position: {
      x: rng.range(DOT_RADIUS_PIXELS, spawnBounds.width - DOT_RADIUS_PIXELS),
      y: rng.range(DOT_RADIUS_PIXELS, spawnBounds.height - DOT_RADIUS_PIXELS),
    },
    velocity: {
      x: Math.cos(heading) * speed,
      y: Math.sin(heading) * speed,
    },
  };

  const snapshot = (): DotSnapshot => ({
    frame,
    entity,
    pixel: toPixelPosition(entity.position),
  });

  const step = (): DotSnapshot => {
    frame += 1;
    entity = moveDot(entity, spawnBounds, FIXED_TIMESTEP_SECONDS);

    return snapshot();
  };

  return {
    snapshot,
    step,
  };
}

export interface DotSimulation {
  snapshot(): DotSnapshot;
  step(): DotSnapshot;
}

export function collectDotPixels(
  seed: number,
  frames: number,
  bounds: DotBounds,
): readonly Position[] {
  const simulation = createDeterministicDotSimulation({ seed, bounds });

  return Array.from({ length: frames }, () => simulation.step().pixel);
}

function moveDot(entity: DotEntity, bounds: DotBounds, deltaSeconds: number): DotEntity {
  let nextX = entity.position.x + entity.velocity.x * deltaSeconds;
  let nextY = entity.position.y + entity.velocity.y * deltaSeconds;
  let nextVelocityX = entity.velocity.x;
  let nextVelocityY = entity.velocity.y;

  if (nextX < DOT_RADIUS_PIXELS || nextX > bounds.width - DOT_RADIUS_PIXELS) {
    nextVelocityX = -nextVelocityX;
    nextX = reflectInsideBounds(nextX, DOT_RADIUS_PIXELS, bounds.width - DOT_RADIUS_PIXELS);
  }

  if (nextY < DOT_RADIUS_PIXELS || nextY > bounds.height - DOT_RADIUS_PIXELS) {
    nextVelocityY = -nextVelocityY;
    nextY = reflectInsideBounds(nextY, DOT_RADIUS_PIXELS, bounds.height - DOT_RADIUS_PIXELS);
  }

  return {
    ...entity,
    position: {
      x: nextX,
      y: nextY,
    },
    velocity: {
      x: nextVelocityX,
      y: nextVelocityY,
    },
  };
}

function reflectInsideBounds(value: number, min: number, max: number): number {
  if (value < min) {
    return min + (min - value);
  }

  if (value > max) {
    return max - (value - max);
  }

  return value;
}

function clampBounds(bounds: DotBounds): DotBounds {
  return {
    width: Math.max(bounds.width, DOT_RADIUS_PIXELS * 4),
    height: Math.max(bounds.height, DOT_RADIUS_PIXELS * 4),
  };
}

function toPixelPosition(position: Position): Position {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
}
