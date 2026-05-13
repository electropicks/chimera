export const simCorePackageName = "@creature/sim-core";
export const simCorePackageResponsibility =
  "Simulation core primitives and deterministic simulation orchestration.";

export { type EntityId, entityExists, getEntityComponents, hasComponent, type World } from "bitecs";

export {
  type BodyComponent,
  type BodyInput,
  type CoreComponents,
  type CreatureOptions,
  createCoreComponents,
  createCreature,
  createFood,
  createSimulationWorld,
  type DecayingVitalComponent,
  type DecayingVitalInput,
  destroyEntity,
  type FoodOptions,
  getCoreComponentList,
  getCoreComponents,
  type PositionComponent,
  type PositionInput,
  type SimulationWorld,
  type VelocityComponent,
  type VelocityInput,
  type VitalComponent,
  type VitalInput,
} from "./components.ts";
export { createRng, type Rng } from "./rng.ts";
