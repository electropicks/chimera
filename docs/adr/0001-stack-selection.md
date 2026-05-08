# ADR 0001: Stack Selection

## Status

Accepted

## Context

Chimera is an 8-week browser POC for a train-a-creature-then-release-it game. The core risks are deterministic simulation, legible behavior, quick iteration, and easy sharing through public preview URLs. The stack should stay small enough for solo development and agent-assisted changes.

## Decision

Use TypeScript in strict mode across a pnpm monorepo. TypeScript gives the shared contracts enough structure to keep package boundaries honest, while pnpm workspaces keep packages cheap to split without introducing a framework-heavy monorepo tool.

Use Vite for the browser app. It keeps the app entry simple, dev startup fast, and Cloudflare Pages deployment conventional.

Use PixiJS for rendering. Chimera needs a readable 2D simulation surface, sprite pooling, cameras, and smooth canvas rendering, but not a full game engine lifecycle yet.

Use bitECS for simulation data. The sim needs many entities, predictable component storage, and a clean separation between deterministic state and rendering.

Use Vitest, fast-check, and Playwright for verification. Vitest covers package-level unit tests, fast-check covers simulation invariants, and Playwright covers the eventual train-to-release browser flow.

Use Biome for formatting and linting. One fast tool is enough for this POC and avoids maintaining separate ESLint and Prettier configurations.

Use Cloudflare Pages for hosting. Every PR should produce a shareable preview URL and `main` should deploy to a stable public URL.

## Consequences

The stack favors explicit contracts over framework magic. Package APIs and deterministic tests carry more weight than runtime dependency injection or global app state. Some conveniences, such as React components or engine-level scene systems, are intentionally postponed until the POC proves the loop.

## Alternatives Considered

- React: useful for UI-heavy apps, but unnecessary for the first canvas-centered POC and easy to add later around the DOM overlay if needed.
- Full game engine: Phaser or similar would provide batteries, but would also own loops, scenes, and asset assumptions before the simulation model is proven.
- ONNX or external ML runtime: too heavy for a tiny seedable policy and harder to inspect for the proud-parent behavior link.
- Redux: the state that matters is deterministic sim state and event logs; a global UI store is premature.
