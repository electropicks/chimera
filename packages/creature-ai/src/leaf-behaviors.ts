import {
  createCreature,
  createFood,
  createSimulationWorld,
  destroyEntity,
  type EntityId,
  type EntitySnapshot,
  getCoreComponents,
  type Intervention,
  type Perception,
  perceive,
  type SimulationWorld,
  snapshotWorld,
  step,
  type WorldSnapshot,
} from "@creature/sim-core";

import type { CreatureAction } from "./behavior.ts";

export interface LeafBehaviorOptions {
  perception?: Perception;
}

export interface LeafBehaviorResult {
  action: CreatureAction;
  entity: EntityId;
  intervention: Intervention | null;
  snapshot: WorldSnapshot;
  world: SimulationWorld;
}

interface CloneResult {
  world: SimulationWorld;
  entityMap: Map<EntityId, EntityId>;
}

export function forage(
  world: SimulationWorld,
  entity: EntityId,
  options: LeafBehaviorOptions = {},
): LeafBehaviorResult {
  const clone = cloneWorld(world);
  const cloneEntity = requireMappedEntity(clone, entity);
  const perception = options.perception ?? perceive(clone.world, cloneEntity);
  const food = perception.nearestFood;
  let intervention: Intervention | null = stop(cloneEntity);

  if (food) {
    const cloneFood = clone.entityMap.get(food.entity) ?? food.entity;

    if (isAdjacent(clone.world, cloneEntity, cloneFood, food.distance)) {
      eatFood(clone.world, cloneEntity, cloneFood);
    } else {
      intervention = setVelocity(clone.world, cloneEntity, food.direction);
    }
  }

  return advance(clone.world, cloneEntity, "forage", intervention);
}

export function rest(world: SimulationWorld, entity: EntityId): LeafBehaviorResult {
  const clone = cloneWorld(world);
  const cloneEntity = requireMappedEntity(clone, entity);
  const components = getCoreComponents(clone.world);
  const originalDecayRate = components.Energy.decay_rate[cloneEntity] ?? 0;

  components.Energy.decay_rate[cloneEntity] = -originalDecayRate * 3;
  step(clone.world, stop(cloneEntity));
  components.Energy.decay_rate[cloneEntity] = originalDecayRate;

  return {
    action: "rest",
    entity: cloneEntity,
    intervention: stop(cloneEntity),
    snapshot: snapshotWorld(clone.world),
    world: clone.world,
  };
}

export function wander(world: SimulationWorld, entity: EntityId): LeafBehaviorResult {
  const clone = cloneWorld(world);
  const cloneEntity = requireMappedEntity(clone, entity);
  const direction = wanderDirection(clone.world, cloneEntity);
  const intervention = setVelocity(clone.world, cloneEntity, direction);

  return advance(clone.world, cloneEntity, "wander", intervention);
}

export function flee(
  world: SimulationWorld,
  entity: EntityId,
  options: LeafBehaviorOptions = {},
): LeafBehaviorResult {
  const clone = cloneWorld(world);
  const cloneEntity = requireMappedEntity(clone, entity);
  const perception = options.perception ?? perceive(clone.world, cloneEntity);
  const threat = perception.nearestThreat;
  const intervention = threat
    ? setVelocity(clone.world, cloneEntity, {
        x: -threat.direction.x,
        y: -threat.direction.y,
      })
    : stop(cloneEntity);

  return advance(clone.world, cloneEntity, "flee", intervention);
}

export function runLeafBehavior(
  world: SimulationWorld,
  entity: EntityId,
  action: CreatureAction,
  options: LeafBehaviorOptions = {},
): LeafBehaviorResult {
  if (action === "forage") {
    return forage(world, entity, options);
  }

  if (action === "rest") {
    return rest(world, entity);
  }

  if (action === "wander") {
    return wander(world, entity);
  }

  return flee(world, entity, options);
}

function advance(
  world: SimulationWorld,
  entity: EntityId,
  action: CreatureAction,
  intervention: Intervention | null,
): LeafBehaviorResult {
  step(world, intervention);

  return {
    action,
    entity,
    intervention,
    snapshot: snapshotWorld(world),
    world,
  };
}

function cloneWorld(source: SimulationWorld): CloneResult {
  const snapshot = snapshotWorld(source);
  const world = createSimulationWorld({
    bounds: snapshot.bounds,
    devAssertions: source.sim.devAssertions,
    seed: snapshot.seed,
  });
  const entityMap = new Map<EntityId, EntityId>();
  const placeholderEntities: EntityId[] = [];
  let nextEntityId = 1;

  world.sim.tick = snapshot.tick;
  world.sim.events = snapshot.events.map((event) => ({ ...event }));
  world.sim.lastSystemOrder = [...snapshot.lastSystemOrder];

  for (const entity of snapshot.entities) {
    while (nextEntityId < entity.id) {
      const placeholder = createCreature(world);
      placeholderEntities.push(placeholder);
      nextEntityId = placeholder + 1;
    }

    const cloneEntity = cloneEntityFromSnapshot(world, entity);

    if (cloneEntity !== entity.id) {
      throw new Error(`expected clone entity ${cloneEntity} to preserve source id ${entity.id}`);
    }

    entityMap.set(entity.id, cloneEntity);
    nextEntityId = cloneEntity + 1;
  }

  for (const placeholder of placeholderEntities) {
    destroyEntity(world, placeholder);
  }

  return { entityMap, world };
}

function cloneEntityFromSnapshot(world: SimulationWorld, entity: EntitySnapshot): EntityId {
  if (
    entity.position &&
    entity.velocity &&
    entity.body &&
    entity.health &&
    entity.hunger &&
    entity.energy
  ) {
    return createCreature(world, {
      body: entity.body,
      energy: entity.energy,
      health: entity.health,
      hunger: entity.hunger,
      position: entity.position,
      velocity: entity.velocity,
    });
  }

  if (entity.position && entity.body && entity.energy) {
    return createFood(world, {
      body: entity.body,
      energy: entity.energy,
      position: entity.position,
    });
  }

  throw new Error(`entity ${entity.id} has no supported clone archetype`);
}

function requireMappedEntity(clone: CloneResult, entity: EntityId): EntityId {
  const cloneEntity = clone.entityMap.get(entity);

  if (cloneEntity === undefined) {
    throw new Error(`entity ${entity} cannot run a leaf behavior`);
  }

  return cloneEntity;
}

function eatFood(world: SimulationWorld, entity: EntityId, food: EntityId): void {
  const components = getCoreComponents(world);
  const nutrition = components.Energy.current[food] ?? 0;
  const currentHunger = components.Hunger.current[entity] ?? 0;
  const maxHunger = components.Hunger.max[entity] ?? 0;

  components.Hunger.current[entity] = clamp(currentHunger - nutrition, 0, maxHunger);
  destroyEntity(world, food);
}

function isAdjacent(
  world: SimulationWorld,
  entity: EntityId,
  target: EntityId,
  distance: number,
): boolean {
  const components = getCoreComponents(world);
  const entitySize = components.Body.size[entity] ?? 0;
  const targetSize = components.Body.size[target] ?? 0;

  return distance <= entitySize + targetSize;
}

function setVelocity(
  world: SimulationWorld,
  entity: EntityId,
  direction: { x: number; y: number },
): Intervention {
  const speed = getCoreComponents(world).Body.speed[entity] ?? 0;

  return {
    entity,
    type: "set_velocity",
    velocity: {
      vx: cleanZero(direction.x * speed),
      vy: cleanZero(direction.y * speed),
    },
  };
}

function stop(entity: EntityId): Intervention {
  return {
    entity,
    type: "set_velocity",
    velocity: { vx: 0, vy: 0 },
  };
}

function wanderDirection(world: SimulationWorld, entity: EntityId): { x: number; y: number } {
  const components = getCoreComponents(world);
  const vx = components.Velocity.vx[entity] ?? 0;
  const vy = components.Velocity.vy[entity] ?? 0;
  const currentFacing = normalize(vx, vy) ?? deterministicFacing(world.sim.seed, entity);
  const turn =
    (hashUnit(`${world.sim.seed}:${world.sim.tick}:${entity}:wander`) - 0.5) * (Math.PI / 4);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);

  return (
    normalize(
      currentFacing.x * cos - currentFacing.y * sin,
      currentFacing.x * sin + currentFacing.y * cos,
    ) ?? currentFacing
  );
}

function deterministicFacing(seed: number, entity: EntityId): { x: number; y: number } {
  const angle = hashUnit(`${seed}:${entity}:facing`) * Math.PI * 2;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

function normalize(x: number, y: number): { x: number; y: number } | null {
  const length = Math.sqrt(x * x + y * y);

  if (length === 0) {
    return null;
  }

  return {
    x: x / length,
    y: y / length,
  };
}

function hashUnit(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0xffffffff;
}

function cleanZero(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : value;
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
