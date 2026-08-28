/**
 * Generatore pseudocasuale deterministico (mulberry32).
 * Il motore non usa mai Math.random(): tutta la casualità passa da qui,
 * così una carriera si può rigiocare identica dal suo seed.
 */
export interface Rng {
  /** Numero in [0, 1). */
  next(): number;
  /** Intero fra min e max, estremi inclusi. */
  int(min: number, max: number): number;
  /** Vero con probabilità p (fuori da [0,1] viene troncato). */
  chance(p: number): boolean;
  /** Un elemento a caso della lista. */
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  const chance = (p: number): boolean => {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return next() < p;
  };

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('pick(): lista vuota');
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new Error('pick(): indice fuori dalla lista');
    return item;
  };

  return { next, int, chance, pick };
}
