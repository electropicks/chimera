import { describe, expect, test } from "vitest";

import { createRng } from "./rng";

describe("createRng", () => {
  test("replays the same 1000 values for the same seed", () => {
    const first = createRng(42);
    const second = createRng(42);

    const firstValues = Array.from({ length: 1000 }, () => first.next());
    const secondValues = Array.from({ length: 1000 }, () => second.next());

    expect(secondValues).toEqual(firstValues);
  });

  test("keeps range values inside the half-open interval", () => {
    const rng = createRng(7);

    const values = Array.from({ length: 1000 }, () => rng.range(-4, 9));

    expect(values.every((value) => value >= -4 && value < 9)).toBe(true);
  });

  test("allows helper methods to be passed around without rebinding", () => {
    const rng = createRng(7);
    const { pick, range } = rng;
    const values = ["forage", "rest", "wander", "flee"] as const;

    expect(range(-4, 9)).toBeGreaterThanOrEqual(-4);
    expect(values).toContain(pick(values));
  });

  test("picks deterministic items from non-empty arrays", () => {
    const first = createRng(99);
    const second = createRng(99);
    const values = ["forage", "rest", "wander", "flee"] as const;

    const firstPicks = Array.from({ length: 50 }, () => first.pick(values));
    const secondPicks = Array.from({ length: 50 }, () => second.pick(values));

    expect(secondPicks).toEqual(firstPicks);
  });

  test("preserves selected nullish items", () => {
    expect(createRng(0).pick(["first", undefined, "third"] as const)).toBeUndefined();
    expect(createRng(5).pick(["first", "second", null] as const)).toBeNull();
  });

  test("forks deterministic child streams without sharing parent state", () => {
    const firstParent = createRng(123);
    const secondParent = createRng(123);

    firstParent.next();
    secondParent.next();

    const firstChild = firstParent.fork();
    const secondChild = secondParent.fork();

    expect(Array.from({ length: 100 }, () => secondChild.next())).toEqual(
      Array.from({ length: 100 }, () => firstChild.next()),
    );
    expect(secondParent.next()).toBe(firstParent.next());
  });
});
