# Changelog

## v0.1.0-foundation - 2026-05-13

Phase 0 establishes Chimera's repository foundation, deterministic simulation skeleton, and public deploy path.

### Features

- Added the TypeScript/pnpm monorepo scaffold with strict typechecking, Biome, Vitest, workspace packages, and tool workspaces.
- Added the root agent guide, stack ADR, package-boundary ADR, and learning-approach ADR.
- Added a deterministic seeded RNG in `@creature/sim-core`.
- Added bitECS-backed core simulation components and entity factories for creatures and food.
- Added the Vite/PixiJS app slice with a deterministic dot rendered on canvas.

### Infrastructure

- Added GitHub Actions verification for typecheck, lint, test, and build.
- Added conventional commit enforcement through commitlint and lefthook.
- Added dependency-cruiser package-boundary enforcement for the one-way package graph.
- Added Cloudflare Pages deployment from GitHub Actions with pull request previews and production deploys.

### Fixes

- Hardened deterministic RNG and sim-core API guard behavior.
- Isolated bitECS component stores per simulation world.
- Synchronized the deterministic dot with resized canvas bounds.
- Tightened CI affected-workspace selection, root tool fallback behavior, and Cloudflare secret guards.
