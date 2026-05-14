import {
  type CreatureAction,
  decide,
  defaultUtilityPolicy,
  runLeafBehavior,
  type UtilityScores,
} from "@creature/creature-ai";
import {
  createCreature,
  createFood,
  createSimulationWorld,
  type EntityId,
  type EntitySnapshot,
  type Perception,
  perceive,
  type SimulationWorld,
  snapshotWorld,
} from "@creature/sim-core";

export interface PocBounds {
  readonly width: number;
  readonly height: number;
}

export interface CreaturePocOptions {
  readonly seed: number;
  readonly bounds: PocBounds;
}

export interface CreaturePocFrameOptions extends CreaturePocOptions {
  readonly frames: number;
}

export interface CreaturePocEntityView {
  readonly id: EntityId;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly velocity: {
    readonly vx: number;
    readonly vy: number;
  };
  readonly hunger: number;
  readonly energy: number;
  readonly health: number;
  readonly senseRadius: number;
  readonly size: number;
}

export interface FoodView {
  readonly id: EntityId;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly energy: number;
}

export interface CreaturePocSnapshot {
  readonly tick: number;
  readonly action: CreatureAction | "observe";
  readonly scores: UtilityScores | null;
  readonly creature: CreaturePocEntityView;
  readonly foods: readonly FoodView[];
  readonly perception: Perception;
}

export interface CreaturePocFrame {
  readonly tick: number;
  readonly action: CreaturePocSnapshot["action"];
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly hunger: number;
  readonly energy: number;
  readonly foodCount: number;
}

export interface CreaturePocSimulation {
  snapshot(): CreaturePocSnapshot;
  step(): CreaturePocSnapshot;
}

const INITIAL_FOOD_COUNT = 4;
const FOOD_SPAWN_POINTS = [
  { x: 44, y: 50 },
  { x: 74, y: 28 },
  { x: 70, y: 76 },
  { x: 26, y: 78 },
  { x: 58, y: 18 },
  { x: 86, y: 54 },
  { x: 38, y: 28 },
  { x: 18, y: 36 },
] as const;

export function createCreaturePocSimulation({
  seed,
  bounds,
}: CreaturePocOptions): CreaturePocSimulation {
  let spawnIndex = 0;
  let world = createSimulationWorld({
    bounds: {
      maxX: bounds.width,
      maxY: bounds.height,
      minX: 0,
      minY: 0,
    },
    seed,
  });
  let creature = createCreature(world, {
    body: { speed: 1.5, size: 1.2, sense_radius: 36 },
    energy: { current: 92, max: 100, decay_rate: 0.25 },
    hunger: { current: 35, max: 100, decay_rate: 0.5 },
    position: { x: 20, y: 50 },
  });

  spawnIndex = ensureFood(world, bounds, spawnIndex, INITIAL_FOOD_COUNT);

  return {
    snapshot: () => createPocSnapshot(world, creature, "observe", null),
    step: () => {
      const perception = perceive(world, creature);
      const decision = decide(perception, defaultUtilityPolicy);
      const result = runLeafBehavior(world, creature, decision.action, { perception });

      world = result.world;
      creature = result.entity;
      spawnIndex = ensureFood(world, bounds, spawnIndex, INITIAL_FOOD_COUNT);

      return createPocSnapshot(world, creature, decision.action, decision.scores);
    },
  };
}

export function collectCreaturePocFrames({
  frames,
  ...options
}: CreaturePocFrameOptions): readonly CreaturePocFrame[] {
  const simulation = createCreaturePocSimulation(options);

  return Array.from({ length: frames }, () => {
    const snapshot = simulation.step();

    return {
      action: snapshot.action,
      energy: snapshot.creature.energy,
      foodCount: snapshot.foods.length,
      hunger: snapshot.creature.hunger,
      position: snapshot.creature.position,
      tick: snapshot.tick,
    };
  });
}

function createPocSnapshot(
  world: SimulationWorld,
  creature: EntityId,
  action: CreaturePocSnapshot["action"],
  scores: UtilityScores | null,
): CreaturePocSnapshot {
  const snapshot = snapshotWorld(world);
  const creatureSnapshot = requireEntity(snapshot.entities, creature);

  return {
    action,
    creature: toCreatureView(creatureSnapshot),
    foods: snapshot.entities.filter(isFoodSnapshot).map(toFoodView),
    perception: perceive(world, creature),
    scores,
    tick: snapshot.tick,
  };
}

function ensureFood(
  world: SimulationWorld,
  bounds: PocBounds,
  spawnIndex: number,
  minimumFood: number,
): number {
  let nextSpawnIndex = spawnIndex;

  while (snapshotWorld(world).entities.filter(isFoodSnapshot).length < minimumFood) {
    const point = FOOD_SPAWN_POINTS[nextSpawnIndex % FOOD_SPAWN_POINTS.length] ?? { x: 50, y: 50 };
    nextSpawnIndex += 1;

    createFood(world, {
      energy: { current: 25, max: 25, decay_rate: 0 },
      position: {
        x: clamp(point.x, 3, bounds.width - 3),
        y: clamp(point.y, 3, bounds.height - 3),
      },
    });
  }

  return nextSpawnIndex;
}

function requireEntity(entities: readonly EntitySnapshot[], entity: EntityId): EntitySnapshot {
  const snapshot = entities.find((current) => current.id === entity);

  if (!snapshot) {
    throw new Error(`Missing creature entity ${entity}`);
  }

  return snapshot;
}

function toCreatureView(entity: EntitySnapshot): CreaturePocEntityView {
  if (!entity.position || !entity.velocity || !entity.hunger || !entity.energy || !entity.health) {
    throw new Error(`Entity ${entity.id} is not a complete creature snapshot`);
  }

  return {
    energy: entity.energy.current,
    health: entity.health.current,
    hunger: entity.hunger.current,
    id: entity.id,
    position: entity.position,
    senseRadius: entity.body?.sense_radius ?? 0,
    size: entity.body?.size ?? 1,
    velocity: entity.velocity,
  };
}

function isFoodSnapshot(entity: EntitySnapshot): boolean {
  return Boolean(
    entity.position &&
      entity.energy &&
      (!entity.resource || entity.resource.current > 0) &&
      !entity.velocity &&
      !entity.health &&
      !entity.hunger,
  );
}

function toFoodView(entity: EntitySnapshot): FoodView {
  if (!entity.position || !entity.energy) {
    throw new Error(`Entity ${entity.id} is not a food snapshot`);
  }

  return {
    energy: entity.energy.current,
    id: entity.id,
    position: entity.position,
  };
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
