# Chimera Agent Guide

Chimera is a Creature Trainer POC: train a creature through focused scenarios, release it into an open world, and make the link between training and later behavior legible.

## Reference Docs

- Project overview: [README.md](README.md)
- Stack decision: [docs/adr/0001-stack-selection.md](docs/adr/0001-stack-selection.md)
- Package boundaries: [docs/adr/0002-package-boundary-rules.md](docs/adr/0002-package-boundary-rules.md)
- Linear project: Creature Trainer POC (Chimera)

## Package Graph

Runtime dependencies flow one way:

```text
packages/app
  -> packages/ui
  -> packages/renderer
  -> packages/creature-ai
  -> packages/sim-core
```

`packages/content` is pure data and should not take runtime dependencies on the other packages.

- `packages/sim-core`: pure deterministic simulation primitives, components, systems, snapshots, events, replay, and lifecycle state.
- `packages/creature-ai`: policies, behavior arbitration, training logic, and behavior/report analysis built on sim contracts.
- `packages/renderer`: PixiJS rendering that reads simulation snapshots and emits presentation events only.
- `packages/ui`: DOM overlays, controls, panels, tutorial, settings, and player-facing interaction surfaces.
- `packages/app`: Vite composition root that wires sim, AI, renderer, UI, persistence, and deployment metadata.
- `packages/content`: scenario and biome definitions as serializable data.
- `tools/headless-sim`: CLI workflows for simulation, balancing, validation, and training runs.
- `tools/replay-viewer`: local tool for inspecting deterministic recordings.

## Four Invariants

1. **sim-core is pure and deterministic.** Given the same seed, world config, and interventions, sim-core must produce the same snapshots and events. No wall-clock APIs, ambient randomness, DOM access, storage, network, or rendering.
2. **Dependencies flow one way.** Higher layers may depend on lower layers through public exports. Lower layers must never import higher layers. Use dependency-cruiser and public `index.ts` exports to keep this true.
3. **Renderer reads sim state and writes nothing back.** Renderer may consume snapshots/events and publish UI-level intents. It must not mutate sim state or reach into sim internals.
4. **Events over coupling.** Cross-package communication should use typed contracts, snapshots, and events instead of direct imports between unrelated layers.

## Commands

- Install: `pnpm install --frozen-lockfile`
- Dev: `pnpm dev` (add when the app package owns a Vite entry)
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build` (add with the first buildable app slice)
- Preview: `pnpm preview` (add with the first Vite app slice)

Run `pnpm typecheck`, `pnpm test`, and `pnpm lint` before closing an issue.

## Commit And PR Hygiene

Use conventional commits. Allowed scopes are:

```text
sim-core, creature-ai, content, renderer, ui, app, infra, docs, tools, deps
```

Examples:

- `feat(sim-core): add deterministic rng`
- `docs(adr): record package boundary rules`
- `ci(infra): run typecheck lint test build on pull requests`

Local hooks and CI should reject vague messages such as `wip fix stuff`, invalid scopes, and PR titles that are not conventional commits.

## Where To Make Changes

- Deterministic world rules, components, resources, replay, or event emission: `packages/sim-core`.
- Policy selection, utility scores, neural policy, training loop, validation, or reports: `packages/creature-ai`.
- PixiJS sprites, camera, interpolation, replay playback, or visual debug overlays: `packages/renderer`.
- HUD, panels, tutorial, settings, intervention controls, or story log display: `packages/ui`.
- Scenario data, reward definitions, seed sets, and biomes: `packages/content`.
- App boot, package wiring, persistence, routing, deploy metadata, and release flow: `packages/app`.
- Batch simulation, validation CLIs, replay inspection, or repo checks: `tools`.
- Architecture decisions and agent guidance: `docs` and this file.

When a change spans packages, start at the lowest stable contract, export it publicly, then wire upward one layer at a time.
