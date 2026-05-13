export const simCorePackageName = "@creature/sim-core";
export const simCorePackageResponsibility =
  "Simulation core primitives and deterministic simulation orchestration.";

export { type EntityId, entityExists, getEntityComponents, hasComponent, type World } from "bitecs";

export {
  Body,
  type BodyComponent,
  type BodyInput,
  type CreatureOptions,
  coreComponents,
  createCreature,
  createFood,
  createSimulationWorld,
  type DecayingVitalComponent,
  type DecayingVitalInput,
  destroyEntity,
  Energy,
  type FoodOptions,
  Health,
  Hunger,
  Position,
  type PositionComponent,
  type PositionInput,
  Velocity,
  type VelocityComponent,
  type VelocityInput,
  type VitalComponent,
  type VitalInput,
} from "./components.ts";
export { createRng, type Rng } from "./rng.ts";
