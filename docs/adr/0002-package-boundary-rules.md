# ADR 0002: Package Boundary Rules

## Status

Accepted

## Context

Chimera depends on deterministic simulation and legible behavior. If rendering, UI, storage, or training shortcuts leak into the simulation core, replay and validation become suspect. The package graph needs to make the correct architecture easier than the wrong one.

## Decision

Runtime dependencies flow one way:

```text
packages/app
  -> packages/ui
  -> packages/renderer
  -> packages/creature-ai
  -> packages/sim-core
```

`packages/content` is pure data. It may expose scenario and biome definitions, but it must not take runtime dependencies on the other packages.

Each package publishes its supported surface through `src/index.ts`. Consumers should import public exports, not package internals. When a lower layer needs to notify a higher layer, it emits typed data, snapshots, or events; it does not import the higher layer.

The four invariants are:

1. `sim-core` is pure and deterministic.
2. Dependencies flow one way.
3. Renderer reads sim state and writes nothing back.
4. Events are preferred over direct coupling.

These rules are enforced through dependency-cruiser, public `index.ts` exports, package-specific AGENTS.md files, and tests around deterministic behavior and replay.

## Consequences

Work should begin at the lowest stable contract and move upward. For example, a new sim event starts in `sim-core`, becomes a public typed export, is interpreted by `creature-ai` or `ui`, and is finally displayed by `renderer` or `app`. This can feel slower than importing directly, but it keeps replay and validation trustworthy.

Dependency-cruiser is a build guard, not a design substitute. ADRs and AGENTS.md files explain the intent so humans and agents can choose the right layer before the guard fires.

## Alternatives Considered

- Free imports between packages: faster at first, but makes deterministic replay and behavior attribution fragile.
- A shared catch-all package: attractive for convenience, but tends to become a dumping ground that hides coupling.
- Event bus everywhere: decoupled, but too indirect for stable lower-level contracts. Use direct public imports down the graph and events when control needs to flow back upward.
