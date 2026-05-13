import {
  addComponent,
  addEntity,
  createWorld,
  type EntityId,
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

export interface CoreComponents {
  Position: PositionComponent;
  Velocity: VelocityComponent;
  Body: BodyComponent;
  Health: VitalComponent;
  Hunger: DecayingVitalComponent;
  Energy: DecayingVitalComponent;
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
] {
  return [
    components.Position,
    components.Velocity,
    components.Body,
    components.Health,
    components.Hunger,
    components.Energy,
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

  addComponent(world, eid, components.Position);
  addComponent(world, eid, components.Body);
  addComponent(world, eid, components.Energy);

  writePosition(components.Position, eid, { ...DEFAULT_POSITION, ...options.position });
  writeBody(components.Body, eid, { ...DEFAULT_FOOD_BODY, ...options.body });
  writeDecayingVital(components.Energy, eid, { ...DEFAULT_FOOD_ENERGY, ...options.energy });

  return eid;
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
