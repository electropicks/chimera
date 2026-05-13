import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  listWorkspaceDirs,
  readWorkspacePatterns,
  selectAffectedWorkspaces,
} from "./affected-workspaces.mjs";

const workspaceDirs = [
  "packages/app",
  "packages/content",
  "packages/creature-ai",
  "packages/renderer",
  "packages/sim-core",
  "packages/ui",
  "tools/headless-sim",
  "tools/replay-viewer",
];

describe("selectAffectedWorkspaces", () => {
  test("runs all workspace tests for root fallback files", () => {
    expect(selectAffectedWorkspaces(["pnpm-lock.yaml"], workspaceDirs)).toEqual({
      affectedDirs: workspaceDirs,
      mode: "all",
    });
  });

  test("includes transitive dependents for lower-layer runtime workspace changes", () => {
    expect(selectAffectedWorkspaces(["packages/sim-core/src/rng.ts"], workspaceDirs)).toEqual({
      affectedDirs: [
        "packages/app",
        "packages/creature-ai",
        "packages/renderer",
        "packages/sim-core",
        "packages/ui",
      ],
      mode: "affected",
    });
  });

  test("keeps content-only changes scoped to content", () => {
    expect(selectAffectedWorkspaces(["packages/content/src/index.ts"], workspaceDirs)).toEqual({
      affectedDirs: ["packages/content"],
      mode: "affected",
    });
  });

  test("skips tests when changes do not affect a workspace", () => {
    expect(selectAffectedWorkspaces(["docs/adr/0001-stack-selection.md"], workspaceDirs)).toEqual({
      affectedDirs: [],
      mode: "none",
    });
  });
});

describe("workspace discovery", () => {
  test("reads pnpm workspace package patterns", () => {
    const workspaceFilePath = join(
      mkdtempSync(join(tmpdir(), "chimera-workspace-")),
      "pnpm-workspace.yaml",
    );

    writeFileSync(
      workspaceFilePath,
      ["packages:", '  - "packages/*"', '  - "tools/*"', "", "onlyBuiltDependencies:"].join("\n"),
    );

    expect(readWorkspacePatterns(workspaceFilePath)).toEqual(["packages/*", "tools/*"]);
  });

  test("discovers package directories from workspace patterns", () => {
    const cwd = mkdtempSync(join(tmpdir(), "chimera-workspace-"));
    writeFileSync(join(cwd, "pnpm-workspace.yaml"), ["packages:", '  - "packages/*"'].join("\n"));
    mkdirSync(join(cwd, "packages", "sim-core"), { recursive: true });
    mkdirSync(join(cwd, "packages", "without-manifest"), { recursive: true });
    writeFileSync(join(cwd, "packages", "sim-core", "package.json"), "{}");

    expect(listWorkspaceDirs({ cwd })).toEqual(["packages/sim-core"]);
  });
});
