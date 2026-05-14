import { createRng } from "./rng.ts";

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WorldObstacle {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WorldModel {
  bounds: WorldBounds;
  obstacles: WorldObstacle[];
  worldSeed: number;
}

export interface GenerateWorldModelOptions {
  bounds?: Partial<WorldBounds>;
  obstacleCount?: number;
  worldSeed: number;
}

export interface ResolveMovementOptions {
  bounds: WorldBounds;
  obstacles: readonly WorldObstacle[];
  position: {
    x: number;
    y: number;
  };
  velocity: {
    vx: number;
    vy: number;
  };
}

export interface ResolvedMovement {
  collided: boolean;
  position: {
    x: number;
    y: number;
  };
}

export const DEFAULT_BOUNDS: WorldBounds = {
  minX: 0,
  minY: 0,
  maxX: 100,
  maxY: 100,
};

export function generateWorldModel({
  bounds,
  obstacleCount = 0,
  worldSeed,
}: GenerateWorldModelOptions): WorldModel {
  if (!Number.isInteger(obstacleCount) || obstacleCount < 0) {
    throw new RangeError("obstacleCount must be a non-negative integer");
  }

  const worldBounds = normalizeWorldBounds(bounds);
  const rng = createRng(worldSeed);
  const width = worldBounds.maxX - worldBounds.minX;
  const height = worldBounds.maxY - worldBounds.minY;
  const minObstacleWidth = Math.max(1, width * 0.04);
  const maxObstacleWidth = Math.max(minObstacleWidth + 1, width * 0.16);
  const minObstacleHeight = Math.max(1, height * 0.04);
  const maxObstacleHeight = Math.max(minObstacleHeight + 1, height * 0.16);
  const obstacles: WorldObstacle[] = [];

  for (let index = 0; index < obstacleCount; index += 1) {
    const obstacleWidth = rng.range(minObstacleWidth, maxObstacleWidth);
    const obstacleHeight = rng.range(minObstacleHeight, maxObstacleHeight);
    const minX = rng.range(worldBounds.minX, worldBounds.maxX - obstacleWidth);
    const minY = rng.range(worldBounds.minY, worldBounds.maxY - obstacleHeight);

    obstacles.push({
      id: `obstacle-${index + 1}`,
      minX,
      minY,
      maxX: minX + obstacleWidth,
      maxY: minY + obstacleHeight,
    });
  }

  return {
    bounds: worldBounds,
    obstacles,
    worldSeed,
  };
}

export function normalizeWorldBounds(bounds: Partial<WorldBounds> = {}): WorldBounds {
  const normalized = {
    ...DEFAULT_BOUNDS,
    ...bounds,
  };

  if (normalized.maxX <= normalized.minX) {
    throw new RangeError("world bounds maxX must be greater than minX");
  }

  if (normalized.maxY <= normalized.minY) {
    throw new RangeError("world bounds maxY must be greater than minY");
  }

  return normalized;
}

export function normalizeWorldObstacles(
  obstacles: readonly WorldObstacle[] = [],
  bounds: WorldBounds,
): WorldObstacle[] {
  return obstacles.map((obstacle) => {
    if (obstacle.maxX <= obstacle.minX || obstacle.maxY <= obstacle.minY) {
      throw new RangeError(`obstacle ${obstacle.id} must have positive width and height`);
    }

    return {
      id: obstacle.id,
      minX: clamp(obstacle.minX, bounds.minX, bounds.maxX),
      minY: clamp(obstacle.minY, bounds.minY, bounds.maxY),
      maxX: clamp(obstacle.maxX, bounds.minX, bounds.maxX),
      maxY: clamp(obstacle.maxY, bounds.minY, bounds.maxY),
    };
  });
}

export function resolveMovement({
  bounds,
  obstacles,
  position,
  velocity,
}: ResolveMovementOptions): ResolvedMovement {
  const target = {
    x: clamp(position.x + velocity.vx, bounds.minX, bounds.maxX),
    y: clamp(position.y + velocity.vy, bounds.minY, bounds.maxY),
  };

  if (!movementBlocked(position, target, obstacles)) {
    return {
      collided: target.x !== position.x + velocity.vx || target.y !== position.y + velocity.vy,
      position: target,
    };
  }

  const horizontalTarget = { x: target.x, y: position.y };

  if (!movementBlocked(position, horizontalTarget, obstacles)) {
    return {
      collided: true,
      position: horizontalTarget,
    };
  }

  const verticalTarget = { x: position.x, y: target.y };

  if (!movementBlocked(position, verticalTarget, obstacles)) {
    return {
      collided: true,
      position: verticalTarget,
    };
  }

  return {
    collided: true,
    position: { ...position },
  };
}

export function isPointInsideObstacle(
  point: { x: number; y: number },
  obstacle: WorldObstacle,
): boolean {
  return (
    point.x >= obstacle.minX &&
    point.x <= obstacle.maxX &&
    point.y >= obstacle.minY &&
    point.y <= obstacle.maxY
  );
}

function movementBlocked(
  start: { x: number; y: number },
  end: { x: number; y: number },
  obstacles: readonly WorldObstacle[],
): boolean {
  return obstacles.some(
    (obstacle) =>
      isPointInsideObstacle(end, obstacle) || segmentIntersectsObstacle(start, end, obstacle),
  );
}

function segmentIntersectsObstacle(
  start: { x: number; y: number },
  end: { x: number; y: number },
  obstacle: WorldObstacle,
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let tMin = 0;
  let tMax = 1;

  const clippedX = clipSegment(-dx, start.x - obstacle.minX, tMin, tMax);

  if (!clippedX) {
    return false;
  }

  tMin = clippedX.tMin;
  tMax = clippedX.tMax;

  const clippedMaxX = clipSegment(dx, obstacle.maxX - start.x, tMin, tMax);

  if (!clippedMaxX) {
    return false;
  }

  tMin = clippedMaxX.tMin;
  tMax = clippedMaxX.tMax;

  const clippedY = clipSegment(-dy, start.y - obstacle.minY, tMin, tMax);

  if (!clippedY) {
    return false;
  }

  tMin = clippedY.tMin;
  tMax = clippedY.tMax;

  return Boolean(clipSegment(dy, obstacle.maxY - start.y, tMin, tMax));
}

function clipSegment(
  denominator: number,
  numerator: number,
  tMin: number,
  tMax: number,
): { tMin: number; tMax: number } | null {
  if (denominator === 0) {
    return numerator >= 0 ? { tMin, tMax } : null;
  }

  const t = numerator / denominator;

  if (denominator < 0) {
    if (t > tMax) {
      return null;
    }

    return { tMin: Math.max(tMin, t), tMax };
  }

  if (t < tMin) {
    return null;
  }

  return { tMin, tMax: Math.min(tMax, t) };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
