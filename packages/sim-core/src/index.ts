export const simCorePackageName = "@creature/sim-core";
export const simCorePackageResponsibility =
  "Simulation core primitives and deterministic simulation orchestration.";

export { type EntityId, entityExists, getEntityComponents, hasComponent, type World } from "bitecs";

export {
  type BodyComponent,
  type BodyInput,
  type ConsumeResourceOptions,
  type ConsumeResourceResult,
  type CoreComponents,
  type CreatureOptions,
  consumeResource,
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
  type ResourceComponent,
  type ResourceInput,
  type SimulationWorld,
  type VelocityComponent,
  type VelocityInput,
  type VitalComponent,
  type VitalInput,
} from "./components.ts";
export {
  type Direction,
  PERCEPTION_FEATURE_ORDER,
  PERCEPTION_FEATURE_VERSION,
  type PerceivedEntity,
  type PerceivedEntityKind,
  type PerceivedTarget,
  type Perception,
  type PerceptionFeatureName,
  type PerceptionVitals,
  perceive,
  perceptionToFeatureVector,
  type VitalReading,
} from "./perception.ts";
export { createRng, type Rng } from "./rng.ts";
export {
  createSimulationMetadata,
  type EntitySnapshot,
  type Intervention,
  type ResourceSystemConfig,
  type SimEvent,
  type SimulationMetadata,
  type SimulationWorldOptions,
  SYSTEM_ORDER,
  type SystemName,
  snapshotWorld,
  step,
  type WorldSnapshot,
} from "./tick.ts";
export {
  DEFAULT_BOUNDS,
  type GenerateWorldModelOptions,
  generateWorldModel,
  type ResolvedMovement,
  type ResolveMovementOptions,
  type WorldBounds,
  type WorldModel,
  type WorldObstacle,
} from "./world-model.ts";
