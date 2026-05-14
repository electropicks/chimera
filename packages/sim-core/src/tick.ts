import { type EntityId, getAllEntities, hasComponent, query } from "bitecs";

import {
  type DecayingVitalComponent,
  getCoreComponents,
  type SimulationWorld,
  type VelocityInput,
} from "./components.ts";
import {
  isPointInsideObstacle,
  normalizeWorldBounds,
  normalizeWorldObstacles,
  resolveMovement,
  type WorldBounds,
  type WorldObstacle,
} from "./world-model.ts";

export const SYSTEM_ORDER = [
  "perception",
  "decision",
  "action",
  "physics",
  "needs_decay",
  "events",
] as const;

export type SystemName = (typeof SYSTEM_ORDER)[number];

export type Intervention =
  | {
      type: "set_velocity";
      entity: EntityId;
      velocity: VelocityInput;
    }
  | {
      type: "nudge";
      entity: EntityId;
      delta: VelocityInput;
    };

export type SimEvent =
  | {
      type: "tick_completed";
      tick: number;
      systems: readonly SystemName[];
    }
  | {
      type: "vital_depleted";
      tick: number;
      entity: EntityId;
      vital: "energy";
    };

export interface SimulationMetadata {
  tick: number;
  seed: number;
  worldSeed: number;
  bounds: WorldBounds;
  obstacles: WorldObstacle[];
  devAssertions: boolean;
  lastSystemOrder: SystemName[];
  events: SimEvent[];
  perception: {
    creatureCount: number;
    foodCount: number;
  };
}

export interface SimulationWorldOptions {
  seed?: number;
  bounds?: Partial<WorldBounds>;
  worldSeed?: number;
  obstacles?: readonly WorldObstacle[];
  devAssertions?: boolean;
}

export interface WorldSnapshot {
  tick: number;
  seed: number;
  worldSeed: number;
  bounds: WorldBounds;
  obstacles: WorldObstacle[];
  entities: EntitySnapshot[];
  events: SimEvent[];
  lastSystemOrder: SystemName[];
}

export interface EntitySnapshot {
  id: EntityId;
  position?: {
    x: number;
    y: number;
  };
  velocity?: VelocityInput;
  body?: {
    speed: number;
    size: number;
    sense_radius: number;
  };
  health?: {
    current: number;
    max: number;
  };
  hunger?: {
    current: number;
    max: number;
    decay_rate: number;
  };
  energy?: {
    current: number;
    max: number;
    decay_rate: number;
  };
}

export function createSimulationMetadata(options: SimulationWorldOptions = {}): SimulationMetadata {
  const bounds = normalizeWorldBounds(options.bounds);

  return {
    tick: 0,
    seed: options.seed ?? 0,
    worldSeed: options.worldSeed ?? 0,
    bounds,
    obstacles: normalizeWorldObstacles(options.obstacles, bounds),
    devAssertions: options.devAssertions ?? true,
    lastSystemOrder: [],
    events: [],
    perception: {
      creatureCount: 0,
      foodCount: 0,
    },
  };
}

export function step(world: SimulationWorld, intervention: Intervention | null): SimulationWorld {
  const previousTick = world.sim.tick;

  world.sim.events = [];
  world.sim.lastSystemOrder = [];

  runSystem(world, "perception", runPerceptionSystem);
  runSystem(world, "decision", (currentWorld) => runDecisionSystem(currentWorld, intervention));
  runSystem(world, "action", runActionSystem);
  runSystem(world, "physics", runPhysicsSystem);
  runSystem(world, "needs_decay", runNeedsDecaySystem);
  runSystem(world, "events", runEventsSystem);

  if (world.sim.devAssertions) {
    assertWorldInvariants(world, previousTick);
  }

  return world;
}

export function snapshotWorld(world: SimulationWorld): WorldSnapshot {
  const components = getCoreComponents(world);
  const entityIds = Array.from(getAllEntities(world));
  entityIds.sort((left, right) => left - right);

  return {
    tick: world.sim.tick,
    seed: world.sim.seed,
    worldSeed: world.sim.worldSeed,
    bounds: { ...world.sim.bounds },
    obstacles: world.sim.obstacles.map((obstacle) => ({ ...obstacle })),
    entities: entityIds.map((eid) => snapshotEntity(world, eid)),
    events: world.sim.events.map((event) => ({ ...event })),
    lastSystemOrder: [...world.sim.lastSystemOrder],
  };

  function snapshotEntity(currentWorld: SimulationWorld, eid: EntityId): EntitySnapshot {
    const entity: EntitySnapshot = { id: eid };

    if (hasComponent(currentWorld, eid, components.Position)) {
      entity.position = {
        x: components.Position.x[eid] ?? 0,
        y: components.Position.y[eid] ?? 0,
      };
    }

    if (hasComponent(currentWorld, eid, components.Velocity)) {
      entity.velocity = {
        vx: components.Velocity.vx[eid] ?? 0,
        vy: components.Velocity.vy[eid] ?? 0,
      };
    }

    if (hasComponent(currentWorld, eid, components.Body)) {
      entity.body = {
        speed: components.Body.speed[eid] ?? 0,
        size: components.Body.size[eid] ?? 0,
        sense_radius: components.Body.sense_radius[eid] ?? 0,
      };
    }

    if (hasComponent(currentWorld, eid, components.Health)) {
      entity.health = {
        current: components.Health.current[eid] ?? 0,
        max: components.Health.max[eid] ?? 0,
      };
    }

    if (hasComponent(currentWorld, eid, components.Hunger)) {
      entity.hunger = {
        current: components.Hunger.current[eid] ?? 0,
        max: components.Hunger.max[eid] ?? 0,
        decay_rate: components.Hunger.decay_rate[eid] ?? 0,
      };
    }

    if (hasComponent(currentWorld, eid, components.Energy)) {
      entity.energy = {
        current: components.Energy.current[eid] ?? 0,
        max: components.Energy.max[eid] ?? 0,
        decay_rate: components.Energy.decay_rate[eid] ?? 0,
      };
    }

    return entity;
  }
}

function runSystem(
  world: SimulationWorld,
  systemName: SystemName,
  system: (world: SimulationWorld) => void,
): void {
  world.sim.lastSystemOrder.push(systemName);
  system(world);
}

function runPerceptionSystem(world: SimulationWorld): void {
  const components = getCoreComponents(world);
  world.sim.perception = {
    creatureCount: query(world, [
      components.Position,
      components.Velocity,
      components.Body,
      components.Health,
      components.Hunger,
      components.Energy,
    ]).length,
    foodCount: query(world, [components.Position, components.Body, components.Energy]).filter(
      (eid) => !hasComponent(world, eid, components.Velocity),
    ).length,
  };
}

function runDecisionSystem(world: SimulationWorld, intervention: Intervention | null): void {
  if (!intervention) {
    return;
  }

  const components = getCoreComponents(world);

  if (!hasComponent(world, intervention.entity, components.Velocity)) {
    return;
  }

  if (intervention.type === "set_velocity") {
    components.Velocity.vx[intervention.entity] = intervention.velocity.vx;
    components.Velocity.vy[intervention.entity] = intervention.velocity.vy;
    return;
  }

  components.Velocity.vx[intervention.entity] =
    (components.Velocity.vx[intervention.entity] ?? 0) + intervention.delta.vx;
  components.Velocity.vy[intervention.entity] =
    (components.Velocity.vy[intervention.entity] ?? 0) + intervention.delta.vy;
}

function runActionSystem(world: SimulationWorld): void {
  const components = getCoreComponents(world);

  for (const eid of query(world, [components.Velocity, components.Body])) {
    const maxSpeed = components.Body.speed[eid] ?? 0;
    const vx = components.Velocity.vx[eid] ?? 0;
    const vy = components.Velocity.vy[eid] ?? 0;
    const speedSquared = vx * vx + vy * vy;

    if (maxSpeed <= 0) {
      components.Velocity.vx[eid] = 0;
      components.Velocity.vy[eid] = 0;
      continue;
    }

    if (speedSquared <= maxSpeed * maxSpeed) {
      continue;
    }

    const scale = maxSpeed / Math.sqrt(speedSquared);
    components.Velocity.vx[eid] = vx * scale;
    components.Velocity.vy[eid] = vy * scale;
  }
}

function runPhysicsSystem(world: SimulationWorld): void {
  const components = getCoreComponents(world);

  for (const eid of query(world, [components.Position, components.Velocity])) {
    const resolved = resolveMovement({
      bounds: world.sim.bounds,
      obstacles: world.sim.obstacles,
      position: {
        x: components.Position.x[eid] ?? 0,
        y: components.Position.y[eid] ?? 0,
      },
      velocity: {
        vx: components.Velocity.vx[eid] ?? 0,
        vy: components.Velocity.vy[eid] ?? 0,
      },
    });

    components.Position.x[eid] = resolved.position.x;
    components.Position.y[eid] = resolved.position.y;

    if (resolved.collided) {
      components.Velocity.vx[eid] = 0;
      components.Velocity.vy[eid] = 0;
    }
  }
}

function runNeedsDecaySystem(world: SimulationWorld): void {
  const components = getCoreComponents(world);

  for (const eid of query(world, [components.Hunger])) {
    components.Hunger.current[eid] = clampVital(
      (components.Hunger.current[eid] ?? 0) + (components.Hunger.decay_rate[eid] ?? 0),
      components.Hunger,
      eid,
    );
  }

  for (const eid of query(world, [components.Energy])) {
    components.Energy.current[eid] = clampVital(
      (components.Energy.current[eid] ?? 0) - (components.Energy.decay_rate[eid] ?? 0),
      components.Energy,
      eid,
    );
  }
}

function runEventsSystem(world: SimulationWorld): void {
  const components = getCoreComponents(world);
  const nextTick = world.sim.tick + 1;

  for (const eid of query(world, [components.Energy])) {
    if ((components.Energy.current[eid] ?? 0) === 0) {
      world.sim.events.push({
        type: "vital_depleted",
        tick: nextTick,
        entity: eid,
        vital: "energy",
      });
    }
  }

  world.sim.tick = nextTick;
  world.sim.events.push({
    type: "tick_completed",
    tick: world.sim.tick,
    systems: SYSTEM_ORDER,
  });
}

function assertWorldInvariants(world: SimulationWorld, previousTick: number): void {
  const components = getCoreComponents(world);

  if (world.sim.tick !== previousTick + 1) {
    throw new Error(`tick count must advance by exactly one from ${previousTick}`);
  }

  for (const eid of query(world, [components.Energy])) {
    if ((components.Energy.current[eid] ?? 0) < 0) {
      throw new Error(`entity ${eid} energy must be greater than or equal to 0`);
    }
  }

  for (const eid of query(world, [components.Position])) {
    const x = components.Position.x[eid] ?? 0;
    const y = components.Position.y[eid] ?? 0;

    if (
      x < world.sim.bounds.minX ||
      x > world.sim.bounds.maxX ||
      y < world.sim.bounds.minY ||
      y > world.sim.bounds.maxY
    ) {
      throw new Error(`entity ${eid} position must stay inside world bounds`);
    }

    if (
      world.sim.obstacles.some((obstacle) =>
        isPointInsideObstacle(
          {
            x,
            y,
          },
          obstacle,
        ),
      )
    ) {
      throw new Error(`entity ${eid} position must stay outside world obstacles`);
    }
  }
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

function clampVital(value: number, component: DecayingVitalComponent, eid: EntityId): number {
  return clamp(value, 0, component.max[eid] ?? 0);
}
