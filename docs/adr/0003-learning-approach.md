# ADR 0003: Learning Approach

## Status

Accepted

## Context

Chimera is a browser POC about training a creature in focused scenarios, releasing it into an open world, and making the connection between training and later behavior legible. The learning approach therefore needs to be deterministic enough for replay, cheap enough to run in-browser, and expressive enough that a creature can visibly adapt from player-guided episodes.

This ADR records the first learning direction before runtime implementation. It follows cody's Linear learning-plan notes as prior art: start with a small neural policy, train it through short scenario episodes, and keep the utility layer as the explanation surface rather than replacing it with an opaque end-to-end learner.

## Decision

Each creature gets a small seedable multilayer perceptron (MLP) policy. Its topology stays fixed and intentionally tiny for the POC; seeds initialize weights and mutation streams so training runs can be replayed and compared.

Training uses episode-based neuroevolution: run a scenario episode, score the behavior against scenario rewards, keep the current best policy, then try hill-climbing mutations around that policy. Mutations change weights by small deterministic perturbations. The training loop favors understandable parent-child comparisons over large population management, gradient infrastructure, or hidden service dependencies.

Utility AI remains the legibility layer. The neural policy may choose or bias actions, but decisions should still be reported through named drives, utility scores, scenario rewards, and behavior events. Player-facing explanations should say which trained tendency won, what utility context made it relevant, and which recent training outcomes shaped it. This keeps the proud-parent link visible even when the MLP is the final action selector.

## Consequences

The approach should fit the package boundaries: deterministic primitives and replay evidence stay in `sim-core`, policy and training logic live in `creature-ai`, scenario reward data stays in `content`, and UI/renderer layers only present snapshots, events, and explanations.

A tiny fixed-topology MLP will not discover rich strategies by itself. Scenario design, reward shaping, mutation scale, and validation runs become important tuning tools. Because the POC uses hill climbing, it may get stuck in local optima; that is acceptable while the goal is to prove the train-release-legibility loop before investing in more complex search.

## Alternatives Considered

- Deep reinforcement learning: can learn powerful policies, but is opaque, slow to tune, and overkill for an in-browser POC whose main risk is legible cause-and-effect rather than benchmark performance.
- Pure utility AI: easy to explain and author, but it does not satisfy the product promise that a creature learns from training episodes; it would make behavior feel scripted rather than shaped.
- Genetic algorithm with large populations: natural fit for neuroevolution, but too expensive for browser-first iteration and harder to present as one creature improving through a clear training lineage.
