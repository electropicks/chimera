import {
  addComponent,
  addEntity,
  createWorld,
  type EntityId,
  registerComponents,
  removeEntity,
  type World,
} from "bitecs";

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

export const Position: PositionComponent = {
  x: [],
  y: [],
};

export const Velocity: VelocityComponent = {
  vx: [],
  vy: [],
};

export const Body: BodyComponent = {
  speed: [],
  size: [],
  sense_radius: [],
};

export const Health: VitalComponent = {
  current: [],
  max: [],
};

export const Hunger: DecayingVitalComponent = {
  current: [],
  max: [],
  decay_rate: [],
};

export const Energy: DecayingVitalComponent = {
  current: [],
  max: [],
  decay_rate: [],
};

export const coreComponents = [Position, Velocity, Body, Health, Hunger, Energy] as const;

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

export function createSimulationWorld(): World {
  const world = createWorld();
  registerComponents(world, [...coreComponents]);
  return world;
}

export function createCreature(world: World, options: CreatureOptions = {}): EntityId {
  const eid = addEntity(world);

  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Body);
  addComponent(world, eid, Health);
  addComponent(world, eid, Hunger);
  addComponent(world, eid, Energy);

  writePosition(eid, { ...DEFAULT_POSITION, ...options.position });
  writeVelocity(eid, { ...DEFAULT_VELOCITY, ...options.velocity });
  writeBody(eid, { ...DEFAULT_CREATURE_BODY, ...options.body });
  writeVital(Health, eid, { ...DEFAULT_HEALTH, ...options.health });
  writeDecayingVital(Hunger, eid, { ...DEFAULT_HUNGER, ...options.hunger });
  writeDecayingVital(Energy, eid, { ...DEFAULT_CREATURE_ENERGY, ...options.energy });

  return eid;
}

export function createFood(world: World, options: FoodOptions = {}): EntityId {
  const eid = addEntity(world);

  addComponent(world, eid, Position);
  addComponent(world, eid, Body);
  addComponent(world, eid, Energy);

  writePosition(eid, { ...DEFAULT_POSITION, ...options.position });
  writeBody(eid, { ...DEFAULT_FOOD_BODY, ...options.body });
  writeDecayingVital(Energy, eid, { ...DEFAULT_FOOD_ENERGY, ...options.energy });

  return eid;
}

export function destroyEntity(world: World, eid: EntityId): void {
  removeEntity(world, eid);
}

function writePosition(eid: EntityId, position: PositionInput): void {
  Position.x[eid] = position.x;
  Position.y[eid] = position.y;
}

function writeVelocity(eid: EntityId, velocity: VelocityInput): void {
  Velocity.vx[eid] = velocity.vx;
  Velocity.vy[eid] = velocity.vy;
}

function writeBody(eid: EntityId, body: BodyInput): void {
  Body.speed[eid] = body.speed;
  Body.size[eid] = body.size;
  Body.sense_radius[eid] = body.sense_radius;
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
