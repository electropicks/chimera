import {
  addComponent,
  addEntity,
  createWorld,
  type EntityId,
  hasComponent,
  registerComponents,
  removeEntity,
  type World,
} from "bitecs";

import {
  createSimulationMetadata,
  type SimulationMetadata,
  type SimulationWorldOptions,
} from "./tick.ts";

export interface PositionComponent {
  x: number[];
  y: number[];
}

export interface VelocityComponent {
  vx: number[];
  vy: number[];
}

export interface BodyComponent {
  speed: number[];
  size: number[];
  sense_radius: number[];
}

export interface VitalComponent {
  current: number[];
  max: number[];
}

export interface DecayingVitalComponent extends VitalComponent {
  decay_rate: number[];
}

export interface ResourceComponent extends VitalComponent {
  nutrition: number[];
  regrow_ticks: number[];
  regrow_remaining: number[];
}

export interface CoreComponents {
  Position: PositionComponent;
  Velocity: VelocityComponent;
  Body: BodyComponent;
  Health: VitalComponent;
  Hunger: DecayingVitalComponent;
  Energy: DecayingVitalComponent;
  Resource: ResourceComponent;
}

export type SimulationWorld = World<{ components: CoreComponents; sim: SimulationMetadata }>;

export function createCoreComponents(): CoreComponents {
  return {
    Position: {
      x: [],
      y: [],
    },
    Velocity: {
      vx: [],
      vy: [],
    },
    Body: {
      speed: [],
      size: [],
      sense_radius: [],
    },
    Health: {
      current: [],
      max: [],
    },
    Hunger: {
      current: [],
      max: [],
      decay_rate: [],
    },
    Energy: {
      current: [],
      max: [],
      decay_rate: [],
    },
    Resource: {
      current: [],
      max: [],
      nutrition: [],
      regrow_ticks: [],
      regrow_remaining: [],
    },
  };
}

export function getCoreComponents(world: SimulationWorld): CoreComponents {
  return world.components;
}

export function getCoreComponentList(
  components: CoreComponents,
): [
  PositionComponent,
  VelocityComponent,
  BodyComponent,
  VitalComponent,
  DecayingVitalComponent,
  DecayingVitalComponent,
  ResourceComponent,
] {
  return [
    components.Position,
    components.Velocity,
    components.Body,
    components.Health,
    components.Hunger,
    components.Energy,
    components.Resource,
  ];
}

export interface PositionInput {
  x: number;
  y: number;
}

export interface VelocityInput {
  vx: number;
  vy: number;
}

export interface BodyInput {
  speed: number;
  size: number;
  sense_radius: number;
}

export interface VitalInput {
  current: number;
  max: number;
}

export interface DecayingVitalInput extends VitalInput {
  decay_rate: number;
}

export interface ResourceInput extends VitalInput {
  nutrition: number;
  regrow_ticks: number;
  regrow_remaining: number;
}

export interface ConsumeResourceOptions {
  consumer: EntityId;
  resource: EntityId;
}

export interface ConsumeResourceResult {
  consumedNutrition: number;
  depleted: boolean;
}

export interface CreatureOptions {
  position?: Partial<PositionInput>;
  velocity?: Partial<VelocityInput>;
  body?: Partial<BodyInput>;
  health?: Partial<VitalInput>;
  hunger?: Partial<DecayingVitalInput>;
  energy?: Partial<DecayingVitalInput>;
}

export interface FoodOptions {
  position?: Partial<PositionInput>;
  body?: Partial<BodyInput>;
  energy?: Partial<DecayingVitalInput>;
  resource?: Partial<ResourceInput>;
}

const DEFAULT_POSITION: PositionInput = {
  x: 0,
  y: 0,
};

const DEFAULT_VELOCITY: VelocityInput = {
  vx: 0,
  vy: 0,
};

const DEFAULT_CREATURE_BODY: BodyInput = {
  speed: 1,
  size: 1,
  sense_radius: 5,
};

const DEFAULT_FOOD_BODY: BodyInput = {
  speed: 0,
  size: 0.5,
  sense_radius: 0,
};

const DEFAULT_HEALTH: VitalInput = {
  current: 100,
  max: 100,
};

const DEFAULT_HUNGER: DecayingVitalInput = {
  current: 0,
  max: 100,
  decay_rate: 1,
};

const DEFAULT_CREATURE_ENERGY: DecayingVitalInput = {
  current: 100,
  max: 100,
  decay_rate: 1,
};

const DEFAULT_FOOD_ENERGY: DecayingVitalInput = {
  current: 25,
  max: 25,
  decay_rate: 0,
};

const DEFAULT_FOOD_RESOURCE: ResourceInput = {
  current: 25,
  max: 25,
  nutrition: 25,
  regrow_ticks: 120,
  regrow_remaining: 0,
};

export function createSimulationWorld(options: SimulationWorldOptions = {}): SimulationWorld {
  const components = createCoreComponents();
  const world = createWorld<{ components: CoreComponents; sim: SimulationMetadata }>({
    components,
    sim: createSimulationMetadata(options),
  });
  registerComponents(world, getCoreComponentList(components));
  return world;
}

export function createCreature(world: SimulationWorld, options: CreatureOptions = {}): EntityId {
  const components = getCoreComponents(world);
  const eid = addEntity(world);

  addComponent(world, eid, components.Position);
  addComponent(world, eid, components.Velocity);
  addComponent(world, eid, components.Body);
  addComponent(world, eid, components.Health);
  addComponent(world, eid, components.Hunger);
  addComponent(world, eid, components.Energy);

  writePosition(components.Position, eid, { ...DEFAULT_POSITION, ...options.position });
  writeVelocity(components.Velocity, eid, { ...DEFAULT_VELOCITY, ...options.velocity });
  writeBody(components.Body, eid, { ...DEFAULT_CREATURE_BODY, ...options.body });
  writeVital(components.Health, eid, { ...DEFAULT_HEALTH, ...options.health });
  writeDecayingVital(components.Hunger, eid, { ...DEFAULT_HUNGER, ...options.hunger });
  writeDecayingVital(components.Energy, eid, { ...DEFAULT_CREATURE_ENERGY, ...options.energy });

  return eid;
}

export function createFood(world: SimulationWorld, options: FoodOptions = {}): EntityId {
  const components = getCoreComponents(world);
  const eid = addEntity(world);
  const resource = normalizeResourceInput(options);

  addComponent(world, eid, components.Position);
  addComponent(world, eid, components.Body);
  addComponent(world, eid, components.Energy);
  addComponent(world, eid, components.Resource);

  writePosition(components.Position, eid, { ...DEFAULT_POSITION, ...options.position });
  writeBody(components.Body, eid, { ...DEFAULT_FOOD_BODY, ...options.body });
  writeDecayingVital(components.Energy, eid, {
    ...DEFAULT_FOOD_ENERGY,
    current: resource.current,
    max: resource.max,
    decay_rate: options.energy?.decay_rate ?? DEFAULT_FOOD_ENERGY.decay_rate,
  });
  writeResource(components.Resource, eid, resource);

  return eid;
}

export function consumeResource(
  world: SimulationWorld,
  { consumer, resource }: ConsumeResourceOptions,
): ConsumeResourceResult {
  const components = getCoreComponents(world);

  if (
    !hasComponent(world, resource, components.Resource) ||
    (components.Resource.current[resource] ?? 0) <= 0
  ) {
    return {
      consumedNutrition: 0,
      depleted: false,
    };
  }

  const consumedNutrition = components.Resource.nutrition[resource] ?? 0;

  if (hasComponent(world, consumer, components.Hunger)) {
    components.Hunger.current[consumer] = clamp(
      (components.Hunger.current[consumer] ?? 0) - consumedNutrition,
      0,
      components.Hunger.max[consumer] ?? 0,
    );
  }

  components.Resource.current[resource] = 0;
  components.Resource.regrow_remaining[resource] = components.Resource.regrow_ticks[resource] ?? 0;

  if (hasComponent(world, resource, components.Energy)) {
    components.Energy.current[resource] = 0;
  }

  return {
    consumedNutrition,
    depleted: true,
  };
}

export function destroyEntity(world: SimulationWorld, eid: EntityId): void {
  removeEntity(world, eid);
}

function writePosition(component: PositionComponent, eid: EntityId, position: PositionInput): void {
  component.x[eid] = position.x;
  component.y[eid] = position.y;
}

function writeVelocity(component: VelocityComponent, eid: EntityId, velocity: VelocityInput): void {
  component.vx[eid] = velocity.vx;
  component.vy[eid] = velocity.vy;
}

function writeBody(component: BodyComponent, eid: EntityId, body: BodyInput): void {
  component.speed[eid] = body.speed;
  component.size[eid] = body.size;
  component.sense_radius[eid] = body.sense_radius;
}

function writeVital(component: VitalComponent, eid: EntityId, vital: VitalInput): void {
  component.current[eid] = vital.current;
  component.max[eid] = vital.max;
}

function writeDecayingVital(
  component: DecayingVitalComponent,
  eid: EntityId,
  vital: DecayingVitalInput,
): void {
  writeVital(component, eid, vital);
  component.decay_rate[eid] = vital.decay_rate;
}

function writeResource(component: ResourceComponent, eid: EntityId, resource: ResourceInput): void {
  writeVital(component, eid, resource);
  component.nutrition[eid] = resource.nutrition;
  component.regrow_ticks[eid] = resource.regrow_ticks;
  component.regrow_remaining[eid] = resource.regrow_remaining;
}

function normalizeResourceInput(options: FoodOptions): ResourceInput {
  const nutrition =
    options.resource?.nutrition ?? options.energy?.current ?? DEFAULT_FOOD_RESOURCE.nutrition;
  const max = options.resource?.max ?? options.energy?.max ?? nutrition;
  const current = options.resource?.current ?? options.energy?.current ?? max;

  return {
    ...DEFAULT_FOOD_RESOURCE,
    current,
    max,
    nutrition,
    ...options.resource,
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
