import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const lintDeps = () =>
  execFileSync("pnpm", ["lint:deps"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });

const runWithTemporaryFile = (path: string, contents: string) => {
  const absolutePath = join(process.cwd(), path);
  writeFileSync(absolutePath, contents);

  try {
    lintDeps();
    throw new Error("Expected pnpm lint:deps to fail for a deliberate boundary violation.");
  } catch (error) {
    if (error instanceof Error && "stdout" in error && "stderr" in error) {
      return `${String(error.stdout)}\n${String(error.stderr)}`;
    }

    throw error;
  } finally {
    rmSync(absolutePath, { force: true });
  }
};

describe("dependency-cruiser package boundary rules", () => {
  test("fail with a readable error when sim-core imports a higher layer", () => {
    const output = runWithTemporaryFile(
      "packages/sim-core/src/__depcruise-violation-proof.ts",
      'import "../../ui/src/index";\n',
    );

    expect(output).toContain("no-sim-core-to-higher-layers");
    expect(output).toContain(
      "packages/sim-core/src/__depcruise-violation-proof.ts → packages/ui/src/index.ts",
    );
  });

  test("fail when a package reaches into another package internal module", () => {
    const output = runWithTemporaryFile(
      "packages/ui/src/__depcruise-violation-proof.ts",
      'import "../../sim-core/src/rng";\n',
    );

    expect(output).toContain("no-sim-core-internal-imports");
    expect(output).toContain(
      "packages/ui/src/__depcruise-violation-proof.ts → packages/sim-core/src/rng.ts",
    );
  });

  test("fail when content takes a runtime dependency on simulation code", () => {
    const output = runWithTemporaryFile(
      "packages/content/src/__depcruise-violation-proof.ts",
      'import "../../sim-core/src/index";\n',
    );

    expect(output).toContain("no-content-runtime-package-deps");
    expect(output).toContain(
      "packages/content/src/__depcruise-violation-proof.ts → packages/sim-core/src/index.ts",
    );
  });
});
