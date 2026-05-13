import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const skipHooks =
  process.env.SKIP_GIT_HOOKS === "1" ||
  process.env.SKIP_GIT_HOOKS === "true" ||
  Boolean(process.env.CI);

if (skipHooks) {
  console.log("Skipping git hook setup.");
  process.exit(0);
}

if (!existsSync(join(process.cwd(), ".git"))) {
  console.log("No .git directory found; skipping git hook setup.");
  process.exit(0);
}

const isWindows = process.platform === "win32";
const lefthookBinary = join(
  process.cwd(),
  "node_modules",
  ".bin",
  isWindows ? "lefthook.cmd" : "lefthook",
);

if (!existsSync(lefthookBinary)) {
  console.log("lefthook is not installed; skipping git hook setup.");
  process.exit(0);
}

const result = spawnSync(lefthookBinary, ["install"], {
  shell: isWindows,
  stdio: "inherit",
});

if (result.error) {
  console.error(`Failed to run lefthook install: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
