import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { findForbiddenSimCoreApis } from "./check-sim-core-determinism.mjs";

const simCoreSourceRoot = join(process.cwd(), "packages", "sim-core", "src");

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const filePaths = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...(await collectTypeScriptFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

const filePaths = await collectTypeScriptFiles(simCoreSourceRoot);
const files = new Map(
  await Promise.all(
    filePaths.map(async (filePath) => [
      relative(process.cwd(), filePath),
      await readFile(filePath, "utf8"),
    ]),
  ),
);

const findings = findForbiddenSimCoreApis(files);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.filePath}:${finding.line} uses forbidden ${finding.api}`);
  }

  process.exitCode = 1;
}
