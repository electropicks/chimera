export const creatureAiPackageName = "@creature/creature-ai";
export const creatureAiPackageResponsibility =
  "Creature behavior, decision-making, and AI systems.";

export {
  ACTIONS,
  type ActionNode,
  type BehaviorContext,
  type BehaviorNode,
  type ConditionNode,
  type CreatureAction,
  type Decision,
  decide,
  defaultUtilityPolicy,
  type SelectorNode,
  type SequenceNode,
  scoreUtilityActions,
  type UtilityActionPolicy,
  type UtilityPolicy,
  type UtilityScores,
  type UtilityWeights,
} from "./behavior.ts";
export {
  flee,
  forage,
  type LeafBehaviorOptions,
  type LeafBehaviorResult,
  rest,
  runLeafBehavior,
  wander,
} from "./leaf-behaviors.ts";
