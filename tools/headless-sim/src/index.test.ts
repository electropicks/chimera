import { describe, expect, test } from "vitest";

import { rowsToCsv, runBatchSimulation, runCli } from "./index";

describe("runBatchSimulation", () => {
  test("returns deterministic rows with final vitals for identical options", () => {
    const options = { seeds: 3, ticks: 8 };

    const first = runBatchSimulation(options);
    const second = runBatchSimulation(options);

    expect(second).toEqual(first);
    expect(first).toEqual([
      {
        seed: 1,
        survival_ticks: 8,
        foraging_events: 0,
        rest_events: 0,
        flee_events: 0,
        final_energy: 92,
        final_hunger: 8,
        cause_of_death: "",
      },
      {
        seed: 2,
        survival_ticks: 8,
        foraging_events: 0,
        rest_events: 0,
        flee_events: 0,
        final_energy: 92,
        final_hunger: 8,
        cause_of_death: "",
      },
      {
        seed: 3,
        survival_ticks: 8,
        foraging_events: 0,
        rest_events: 0,
        flee_events: 0,
        final_energy: 92,
        final_hunger: 8,
        cause_of_death: "",
      },
    ]);
  });

  test("rejects invalid batch options", () => {
    expect(() => runBatchSimulation({ seeds: 0, ticks: 10 })).toThrow(
      "--seeds must be a positive integer",
    );
    expect(() => runBatchSimulation({ seeds: 1, ticks: -1 })).toThrow(
      "--ticks must be a positive integer",
    );
  });
});

describe("rowsToCsv", () => {
  test("writes the accepted CSV headers and row values", () => {
    const csv = rowsToCsv([
      {
        seed: 7,
        survival_ticks: 3,
        foraging_events: 0,
        rest_events: 0,
        flee_events: 0,
        final_energy: 97,
        final_hunger: 3,
        cause_of_death: "",
      },
    ]);

    expect(csv).toBe(
      [
        "seed,survival_ticks,foraging_events,rest_events,flee_events,final_energy,final_hunger,cause_of_death",
        "7,3,0,0,0,97,3,",
      ].join("\n"),
    );
  });
});

describe("runCli", () => {
  test("returns a nonzero exit code and writes usage errors for invalid arguments", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(["--seeds", "0", "--ticks", "10", "--output", "results.csv"], {
      writeStdout: () => undefined,
      writeStderr: (message) => stderr.push(message),
      writeFile: async () => undefined,
    });

    expect(exitCode).toBe(1);
    expect(stderr.join("")).toContain("--seeds must be a positive integer");
  });
});
