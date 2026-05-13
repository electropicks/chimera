import {
  PERCEPTION_FEATURE_ORDER,
  type Perception,
  type PerceptionFeatureName,
  perceptionToFeatureVector,
} from "@creature/sim-core";

export const ACTIONS = ["forage", "rest", "wander", "flee"] as const;

export type CreatureAction = (typeof ACTIONS)[number];

export type UtilityScores = Record<CreatureAction, number>;

export type UtilityWeights = Partial<Record<PerceptionFeatureName, number>>;

export interface UtilityActionPolicy {
  weights: UtilityWeights;
}

export interface UtilityPolicy {
  actions: Record<CreatureAction, UtilityActionPolicy>;
  seed: number;
  noiseScale: number;
}

export interface Decision {
  action: CreatureAction;
  scores: UtilityScores;
  reason: string;
}

export interface BehaviorContext {
  perception: Perception;
  policy: UtilityPolicy;
}

export interface SelectorNode {
  type: "Selector";
  children: BehaviorNode[];
}

export interface SequenceNode {
  type: "Sequence";
  children: BehaviorNode[];
}

export interface ActionNode {
  type: "Action";
  action: CreatureAction;
}

export interface ConditionNode {
  type: "Condition";
  name: string;
  evaluate: (context: BehaviorContext) => boolean;
}

export type BehaviorNode = SelectorNode | SequenceNode | ActionNode | ConditionNode;

export const defaultUtilityPolicy: UtilityPolicy = {
  seed: 17,
  noiseScale: 0.001,
  actions: {
    forage: {
      weights: {
        hunger: 2.2,
        nearest_food_present: 1.6,
        nearest_food_distance: -0.9,
        nearest_threat_present: -2.4,
      },
    },
    rest: {
      weights: {
        health: 0.6,
        energy: -0.8,
        hunger: -0.2,
        nearest_threat_present: -2.6,
      },
    },
    wander: {
      weights: {
        hunger: -0.2,
        energy: 0.25,
        nearest_food_present: -0.25,
        nearest_threat_present: -2,
        local_obstacle_density: -0.5,
      },
    },
    flee: {
      weights: {
        health: -0.4,
        energy: 0.35,
        nearest_threat_present: 3,
        nearest_threat_distance: -1.4,
      },
    },
  },
};

export function scoreUtilityActions(perception: Perception, policy: UtilityPolicy): UtilityScores {
  return {
    forage: scoreAction(perception, policy, "forage"),
    rest: scoreAction(perception, policy, "rest"),
    wander: scoreAction(perception, policy, "wander"),
    flee: scoreAction(perception, policy, "flee"),
  };
}

export function decide(perception: Perception, policy: UtilityPolicy): Decision {
  const scores = scoreUtilityActions(perception, policy);
  const action = selectHighestScore(scores);

  return {
    action,
    scores,
    reason: `${action} selected with utility ${scores[action].toFixed(3)}`,
  };
}

function scoreAction(
  perception: Perception,
  policy: UtilityPolicy,
  action: CreatureAction,
): number {
  const features = perceptionToFeatureVector(perception);
  const weights = policy.actions[action].weights;
  let score = 0;

  for (const [index, featureName] of PERCEPTION_FEATURE_ORDER.entries()) {
    score += (weights[featureName] ?? 0) * (features[index] ?? 0);
  }

  return score + deterministicNoise(policy.seed, perception.entity, action, policy.noiseScale);
}

function selectHighestScore(scores: UtilityScores): CreatureAction {
  let selected: CreatureAction = ACTIONS[0];

  for (const action of ACTIONS.slice(1)) {
    if (scores[action] > scores[selected]) {
      selected = action;
    }
  }

  return selected;
}

function deterministicNoise(
  seed: number,
  entity: number,
  action: CreatureAction,
  noiseScale: number,
): number {
  if (noiseScale === 0) {
    return 0;
  }

  const hash = hashString(`${seed}:${entity}:${action}`);
  return ((hash / 0xffffffff) * 2 - 1) * noiseScale;
}

function hashString(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
