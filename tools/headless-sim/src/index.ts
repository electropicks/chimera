import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { createCreature, createSimulationWorld, snapshotWorld, step } from "@creature/sim-core";

export const headlessSimPackageName = "@creature/headless-sim";
export const headlessSimPackageResponsibility = "Headless simulation tooling for non-visual runs.";

export interface BatchSimulationOptions {
  seeds: number;
  ticks: number;
}

export interface SimulationCsvRow {
  seed: number;
  survival_ticks: number;
  foraging_events: number;
  rest_events: number;
  flee_events: number;
  final_energy: number;
  final_hunger: number;
  cause_of_death: "" | "energy_depleted";
}

export interface CliIo {
  writeStdout: (message: string) => void;
  writeStderr: (message: string) => void;
  writeFile: (path: string, contents: string) => Promise<void>;
}

const CSV_COLUMNS = [
  "seed",
  "survival_ticks",
  "foraging_events",
  "rest_events",
  "flee_events",
  "final_energy",
  "final_hunger",
  "cause_of_death",
] as const;

export function runBatchSimulation(options: BatchSimulationOptions): SimulationCsvRow[] {
  validatePositiveInteger("--seeds", options.seeds);
  validatePositiveInteger("--ticks", options.ticks);

  const rows: SimulationCsvRow[] = [];

  for (let seed = 1; seed <= options.seeds; seed += 1) {
    rows.push(runSingleSimulation(seed, options.ticks));
  }

  return rows;
}

export function rowsToCsv(rows: readonly SimulationCsvRow[]): string {
  return [
    CSV_COLUMNS.join(","),
    ...rows.map((row) => CSV_COLUMNS.map((column) => String(row[column])).join(",")),
  ].join("\n");
}

export async function runCli(
  argv: readonly string[],
  io: CliIo = {
    writeStdout: (message) => process.stdout.write(message),
    writeStderr: (message) => process.stderr.write(message),
    writeFile,
  },
): Promise<number> {
  try {
    const options = parseCliArgs(argv);
    const rows = runBatchSimulation({ seeds: options.seeds, ticks: options.ticks });
    await io.writeFile(options.output, `${rowsToCsv(rows)}\n`);
    return 0;
  } catch (error) {
    io.writeStderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

interface CliOptions extends BatchSimulationOptions {
  output: string;
}

function runSingleSimulation(seed: number, maxTicks: number): SimulationCsvRow {
  const world = createSimulationWorld({ seed, devAssertions: false });
  const creature = createCreature(world, {
    position: {
      x: 50,
      y: 50,
    },
  });

  let survivalTicks = 0;
  let causeOfDeath: SimulationCsvRow["cause_of_death"] = "";

  for (let tick = 0; tick < maxTicks; tick += 1) {
    step(world, {
      type: "set_velocity",
      entity: creature,
      velocity: velocityForTick(seed, tick),
    });
    survivalTicks = world.sim.tick;

    if (
      world.sim.events.some((event) => event.type === "vital_depleted" && event.entity === creature)
    ) {
      causeOfDeath = "energy_depleted";
      break;
    }
  }

  const creatureSnapshot = snapshotWorld(world).entities.find((entity) => entity.id === creature);

  return {
    seed,
    survival_ticks: survivalTicks,
    foraging_events: 0,
    rest_events: 0,
    flee_events: 0,
    final_energy: creatureSnapshot?.energy?.current ?? 0,
    final_hunger: creatureSnapshot?.hunger?.current ?? 0,
    cause_of_death: causeOfDeath,
  };
}

function velocityForTick(seed: number, tick: number): { vx: number; vy: number } {
  const direction = (seed + tick) % 4;

  if (direction === 0) {
    return { vx: 1, vy: 0 };
  }

  if (direction === 1) {
    return { vx: 0, vy: 1 };
  }

  if (direction === 2) {
    return { vx: -1, vy: 0 };
  }

  return { vx: 0, vy: -1 };
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(usage("Expected arguments: --seeds <count> --ticks <count> --output <path>"));
    }

    if (flag !== "--seeds" && flag !== "--ticks" && flag !== "--output") {
      throw new Error(usage(`Unknown option: ${flag}`));
    }

    values.set(flag, value);
  }

  const seeds = readInteger(values, "--seeds");
  const ticks = readInteger(values, "--ticks");
  const output = values.get("--output");

  if (!output) {
    throw new Error(usage("--output is required"));
  }

  validatePositiveInteger("--seeds", seeds);
  validatePositiveInteger("--ticks", ticks);

  return { seeds, ticks, output };
}

function readInteger(values: ReadonlyMap<string, string>, flag: "--seeds" | "--ticks"): number {
  const value = values.get(flag);

  if (value === undefined) {
    throw new Error(usage(`${flag} is required`));
  }

  const parsed = Number(value);
  validatePositiveInteger(flag, parsed);
  return parsed;
}

function validatePositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function usage(message: string): string {
  return `${message}\nUsage: pnpm sim --seeds 100 --ticks 2000 --output results.csv`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}
