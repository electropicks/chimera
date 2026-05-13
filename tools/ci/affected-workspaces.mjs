#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";

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

const rootFallbackFiles = new Set([
  "biome.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "vitest.config.ts",
]);

const rootFallbackPrefixes = [".github/", "tools/ci/", "tools/check-"];

const changedFileListPath = process.argv[2];
const changedFiles = changedFileListPath
  ? readFileSync(changedFileListPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  : [];

const writesToGitHubOutput = Boolean(process.env.GITHUB_OUTPUT);
const writeOutput = (key, value) => {
  const line = `${key}=${value}`;
  if (writesToGitHubOutput) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  }
  console.log(line);
};

const runAll =
  changedFiles.length === 0 ||
  changedFiles.some(
    (file) =>
      rootFallbackFiles.has(file) || rootFallbackPrefixes.some((prefix) => file.startsWith(prefix)),
  );

const affectedDirs = runAll
  ? workspaceDirs
  : workspaceDirs.filter((dir) =>
      changedFiles.some((file) => file === dir || file.startsWith(`${dir}/`)),
    );

const mode = runAll ? "all" : affectedDirs.length > 0 ? "affected" : "none";

writeOutput("mode", mode);
writeOutput("dirs", affectedDirs.join(" "));
writeOutput("changed_count", String(changedFiles.length));
