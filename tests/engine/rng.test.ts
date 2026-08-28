import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng.js';

describe('createRng', () => {
  it('produce la stessa sequenza per lo stesso seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('produce sequenze diverse per seed diversi', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() resta dentro [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int() rispetta gli estremi, inclusi', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const value = rng.int(3, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6]));
  });

  it('int() con estremi uguali restituisce quel valore', () => {
    const rng = createRng(5);
    expect(rng.int(4, 4)).toBe(4);
  });

  it('chance(0) è sempre falso e chance(1) è sempre vero', () => {
    const rng = createRng(11);
    for (let i = 0; i < 100; i += 1) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('chance(0.5) si avvicina alla metà su molti tiri', () => {
    const rng = createRng(2026);
    let hits = 0;
    for (let i = 0; i < 10_000; i += 1) {
      if (rng.chance(0.5)) hits += 1;
    }
    expect(hits).toBeGreaterThan(4700);
    expect(hits).toBeLessThan(5300);
  });

  it('pick() restituisce un elemento della lista', () => {
    const rng = createRng(3);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i += 1) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('pick() su lista vuota lancia un errore', () => {
    const rng = createRng(3);
    expect(() => rng.pick([])).toThrow('lista vuota');
  });
});
