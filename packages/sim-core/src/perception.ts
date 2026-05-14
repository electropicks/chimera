import { type EntityId, entityExists, getAllEntities, hasComponent } from "bitecs";

import { getCoreComponents, type SimulationWorld } from "./components.ts";

export const PERCEPTION_FEATURE_VERSION = 1;

export const PERCEPTION_FEATURE_ORDER = [
  "hunger",
  "energy",
  "health",
  "nearest_food_present",
  "nearest_food_distance",
  "nearest_food_direction_x",
  "nearest_food_direction_y",
  "nearest_threat_present",
  "nearest_threat_distance",
  "nearest_threat_direction_x",
  "nearest_threat_direction_y",
  "nearest_creature_present",
  "nearest_creature_distance",
  "nearest_creature_direction_x",
  "nearest_creature_direction_y",
  "local_obstacle_density",
] as const;

export type PerceptionFeatureName = (typeof PERCEPTION_FEATURE_ORDER)[number];

export interface Direction {
  x: number;
  y: number;
}

export type PerceivedEntityKind = "food" | "creature" | "threat" | "obstacle";

export interface PerceivedEntity {
  entity: EntityId;
  kind: PerceivedEntityKind;
  distance: number;
  direction: Direction;
}

export interface PerceivedTarget {
  entity: EntityId;
  distance: number;
  direction: Direction;
}

export interface PerceptionVitals {
  hunger: VitalReading;
  energy: VitalReading;
  health: VitalReading;
}

export interface VitalReading {
  current: number;
  max: number;
}

export interface Perception {
  entity: EntityId;
  senseRadius: number;
  visibleEntities: PerceivedEntity[];
  nearestFood: PerceivedTarget | null;
  nearestThreat: PerceivedTarget | null;
  nearestCreature: PerceivedTarget | null;
  vitals: PerceptionVitals;
  localObstacleDensity: number;
}

export function perceive(world: SimulationWorld, entityId: EntityId): Perception {
  const components = getCoreComponents(world);

  if (
    !entityExists(world, entityId) ||
    !hasComponent(world, entityId, components.Position) ||
    !hasComponent(world, entityId, components.Body)
  ) {
    throw new Error(`entity ${entityId} must have Position and Body components to perceive`);
  }

  const observerX = components.Position.x[entityId] ?? 0;
  const observerY = components.Position.y[entityId] ?? 0;
  const senseRadius = components.Body.sense_radius[entityId] ?? 0;
  const visibleEntities: PerceivedEntity[] = [];

  for (const candidate of sortedEntityIds(world)) {
    if (candidate === entityId || !hasComponent(world, candidate, components.Position)) {
      continue;
    }

    const distance = distanceBetween(
      observerX,
      observerY,
      components.Position.x[candidate] ?? 0,
      components.Position.y[candidate] ?? 0,
    );

    if (distance > senseRadius) {
      continue;
    }

    const kind = classifyPerceivedEntity(world, candidate);

    if (!kind) {
      continue;
    }

    visibleEntities.push({
      entity: candidate,
      kind,
      distance,
      direction: directionBetween(
        observerX,
        observerY,
        components.Position.x[candidate] ?? 0,
        components.Position.y[candidate] ?? 0,
        distance,
      ),
    });
  }

  return {
    entity: entityId,
    senseRadius,
    visibleEntities,
    nearestFood: nearestVisibleEntity(visibleEntities, "food"),
    nearestThreat: nearestVisibleEntity(visibleEntities, "threat"),
    nearestCreature: nearestVisibleEntity(visibleEntities, "creature"),
    vitals: {
      hunger: readVital(components.Hunger, entityId),
      energy: readVital(components.Energy, entityId),
      health: readVital(components.Health, entityId),
    },
    localObstacleDensity: 0,
  };
}

export function perceptionToFeatureVector(perception: Perception): Float32Array {
  return new Float32Array([
    normalizeVital(perception.vitals.hunger),
    normalizeVital(perception.vitals.energy),
    normalizeVital(perception.vitals.health),
    ...targetFeatures(perception.nearestFood, perception.senseRadius),
    ...targetFeatures(perception.nearestThreat, perception.senseRadius),
    ...targetFeatures(perception.nearestCreature, perception.senseRadius),
    clamp01(perception.localObstacleDensity),
  ]);
}

function sortedEntityIds(world: SimulationWorld): EntityId[] {
  const entityIds = Array.from(getAllEntities(world));
  entityIds.sort((left, right) => left - right);
  return entityIds;
}

function classifyPerceivedEntity(
  world: SimulationWorld,
  entityId: EntityId,
): PerceivedEntityKind | null {
  const components = getCoreComponents(world);
  const hasPosition = hasComponent(world, entityId, components.Position);
  const hasBody = hasComponent(world, entityId, components.Body);
  const hasEnergy = hasComponent(world, entityId, components.Energy);

  if (!hasPosition || !hasBody || !hasEnergy) {
    return null;
  }

  const hasVelocity = hasComponent(world, entityId, components.Velocity);
  const hasHealth = hasComponent(world, entityId, components.Health);
  const hasHunger = hasComponent(world, entityId, components.Hunger);

  if (hasVelocity && hasHealth && hasHunger) {
    return "creature";
  }

  if (!hasVelocity && !hasHealth && !hasHunger) {
    if (
      hasComponent(world, entityId, components.Resource) &&
      (components.Resource.current[entityId] ?? 0) <= 0
    ) {
      return null;
    }

    return "food";
  }

  return null;
}

function nearestVisibleEntity(
  visibleEntities: readonly PerceivedEntity[],
  kind: PerceivedEntityKind,
): PerceivedTarget | null {
  let nearest: PerceivedEntity | null = null;

  for (const entity of visibleEntities) {
    if (entity.kind !== kind) {
      continue;
    }

    if (
      !nearest ||
      entity.distance < nearest.distance ||
      (entity.distance === nearest.distance && entity.entity < nearest.entity)
    ) {
      nearest = entity;
    }
  }

  if (!nearest) {
    return null;
  }

  return {
    entity: nearest.entity,
    distance: nearest.distance,
    direction: nearest.direction,
  };
}

function readVital(
  component: { current: number[]; max: number[] },
  entityId: EntityId,
): VitalReading {
  return {
    current: component.current[entityId] ?? 0,
    max: component.max[entityId] ?? 0,
  };
}

function distanceBetween(fromX: number, fromY: number, toX: number, toY: number): number {
  const dx = toX - fromX;
  const dy = toY - fromY;
  return Math.sqrt(dx * dx + dy * dy);
}

function directionBetween(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  distance: number,
): Direction {
  if (distance === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (toX - fromX) / distance,
    y: (toY - fromY) / distance,
  };
}

function targetFeatures(
  target: PerceivedTarget | null,
  senseRadius: number,
): [number, number, number, number] {
  if (!target) {
    return [0, 1, 0, 0];
  }

  return [
    1,
    normalizeDistance(target.distance, senseRadius),
    target.direction.x,
    target.direction.y,
  ];
}

function normalizeVital(vital: VitalReading): number {
  if (vital.max <= 0) {
    return 0;
  }

  return clamp01(vital.current / vital.max);
}

function normalizeDistance(distance: number, senseRadius: number): number {
  if (senseRadius <= 0) {
    return 1;
  }

  return clamp01(distance / senseRadius);
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}
