export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  pick<T>(items: readonly [T, ...T[]]): T;
  fork(): Rng;
}

const UINT32_MAX_EXCLUSIVE = 0x1_0000_0000;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const nextUint32 = (): number => {
    state = (state + 0x9e37_79b9) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 16), 0x21f0_aaad);
    value = Math.imul(value ^ (value >>> 15), 0x735a_2d97);
    return (value ^ (value >>> 15)) >>> 0;
  };

  const next = (): number => nextUint32() / UINT32_MAX_EXCLUSIVE;

  const range = (min: number, max: number): number => {
    if (max <= min) {
      throw new RangeError("max must be greater than min");
    }

    return min + next() * (max - min);
  };

  const pick = <T>(items: readonly [T, ...T[]]): T => {
    const index = Math.floor(range(0, items.length));

    if (index < 0 || index >= items.length) {
      throw new RangeError("selected index is outside the item list");
    }

    return items[index] as T;
  };

  const fork = (): Rng => createRng(nextUint32());

  return {
    next,
    range,
    pick,
    fork,
  };
}
