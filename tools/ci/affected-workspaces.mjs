#!/usr/bin/env node
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootFallbackFiles = new Set([
  "biome.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "vitest.config.ts",
]);

const rootFallbackPrefixes = [".github/", "tools/ci/", "tools/check-"];
const rootFallbackTestTargets = ["tools/ci", "tools/check-sim-core-determinism.test.ts"];

const runtimeDependencyChain = [
  "packages/sim-core",
  "packages/creature-ai",
  "packages/renderer",
  "packages/ui",
  "packages/app",
];

const dependentDirsByWorkspace = new Map(
  runtimeDependencyChain.map((dir, index) => [dir, runtimeDependencyChain.slice(index + 1)]),
);

/**
 * @param {string | undefined} changedFileListPath
 * @returns {string[]}
 */
export const readChangedFiles = (changedFileListPath) =>
  changedFileListPath
    ? readFileSync(changedFileListPath, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

/**
 * @param {string} [workspaceFilePath]
 * @returns {string[]}
 */
export const readWorkspacePatterns = (workspaceFilePath = "pnpm-workspace.yaml") => {
  /** @type {string[]} */
  const patterns = [];
  let inPackages = false;

  for (const line of readFileSync(workspaceFilePath, "utf8").split("\n")) {
    if (line === "packages:") {
      inPackages = true;
      continue;
    }

    if (inPackages && line.length > 0 && !line.startsWith(" ")) {
      break;
    }

    const match = inPackages ? line.match(/^\s*-\s*["']?([^"']+)["']?\s*$/u) : null;
    if (match?.[1]) {
      patterns.push(match[1]);
    }
  }

  return patterns;
};

/**
 * @param {{ cwd?: string; workspaceFilePath?: string }} [options]
 * @returns {string[]}
 */
export const listWorkspaceDirs = ({
  cwd = process.cwd(),
  workspaceFilePath = join(cwd, "pnpm-workspace.yaml"),
} = {}) =>
  readWorkspacePatterns(workspaceFilePath)
    .flatMap((pattern) => {
      if (!pattern.endsWith("/*")) {
        return existsSync(join(cwd, pattern, "package.json")) ? [pattern] : [];
      }

      const parentDir = pattern.slice(0, -"/*".length);
      const absoluteParentDir = join(cwd, parentDir);
      if (!existsSync(absoluteParentDir)) {
        return [];
      }

      return readdirSync(absoluteParentDir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() && existsSync(join(absoluteParentDir, entry.name, "package.json")),
        )
        .map((entry) => `${parentDir}/${entry.name}`);
    })
    .sort();

/**
 * @param {string[]} changedFiles
 * @param {string[]} [workspaceDirs]
 * @returns {{ affectedDirs: string[]; mode: "all" | "affected" | "none" }}
 */
export const selectAffectedWorkspaces = (changedFiles, workspaceDirs = listWorkspaceDirs()) => {
  const runAll =
    changedFiles.length === 0 ||
    changedFiles.some(
      (file) =>
        rootFallbackFiles.has(file) ||
        rootFallbackPrefixes.some((prefix) => file.startsWith(prefix)),
    );

  if (runAll) {
    return {
      affectedDirs: [...workspaceDirs, ...rootFallbackTestTargets],
      mode: "all",
    };
  }

  const directAffectedDirs = workspaceDirs.filter((dir) =>
    changedFiles.some((file) => file === dir || file.startsWith(`${dir}/`)),
  );
  const affectedDirSet = new Set(directAffectedDirs);

  for (const dir of directAffectedDirs) {
    for (const dependentDir of dependentDirsByWorkspace.get(dir) ?? []) {
      if (workspaceDirs.includes(dependentDir)) {
        affectedDirSet.add(dependentDir);
      }
    }
  }

  const affectedDirs = workspaceDirs.filter((dir) => affectedDirSet.has(dir));

  return {
    affectedDirs,
    mode: affectedDirs.length > 0 ? "affected" : "none",
  };
};

/**
 * @param {string} key
 * @param {string} value
 */
const writeOutput = (key, value) => {
  const line = `${key}=${value}`;
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  }
  console.log(line);
};

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const changedFiles = readChangedFiles(process.argv[2]);
  const workspaceDirs = listWorkspaceDirs({
    cwd: dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  });
  const { affectedDirs, mode } = selectAffectedWorkspaces(changedFiles, workspaceDirs);

  writeOutput("mode", mode);
  writeOutput("dirs", affectedDirs.join(" "));
  writeOutput("changed_count", String(changedFiles.length));
}
