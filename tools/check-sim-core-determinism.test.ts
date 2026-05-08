import { describe, expect, test } from "vitest";

import { findForbiddenSimCoreApis } from "./check-sim-core-determinism";

describe("findForbiddenSimCoreApis", () => {
  test("reports ambient randomness and wall-clock APIs in sim-core sources", () => {
    const files = new Map([
      ["packages/sim-core/src/ok.ts", "export const seed = 42;"],
      ["packages/sim-core/src/bad.ts", "Math.random();\nDate.now();"],
    ]);

    expect(findForbiddenSimCoreApis(files)).toEqual([
      {
        api: "Math.random",
        filePath: "packages/sim-core/src/bad.ts",
        line: 1,
      },
      {
        api: "Date.now",
        filePath: "packages/sim-core/src/bad.ts",
        line: 2,
      },
    ]);
  });
});
