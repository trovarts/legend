import { describe, expect, it } from 'vitest';
import { canLeave, signContract, tickContract } from '../../src/engine/contract';
import { createRng } from '../../src/engine/rng';

describe('signContract', () => {
  it('un giovane firma contratti lunghi', () => {
    let total = 0;
    for (let seed = 0; seed < 200; seed += 1) total += signContract(1, 19, createRng(seed)).yearsLeft;
    expect(total / 200).toBeGreaterThan(3);
  });

  it('un veterano firma contratti corti', () => {
    let total = 0;
    for (let seed = 0; seed < 200; seed += 1) total += signContract(1, 35, createRng(seed)).yearsLeft;
    expect(total / 200).toBeLessThan(2.5);
  });

  it('la durata resta fra uno e cinque anni', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      for (const age of [17, 24, 31, 38]) {
        const contract = signContract(3, age, createRng(seed));
        expect(contract.yearsLeft).toBeGreaterThanOrEqual(1);
        expect(contract.yearsLeft).toBeLessThanOrEqual(5);
        expect(contract.signedInSeason).toBe(3);
      }
    }
  });
});

describe('tickContract', () => {
  it('ogni stagione toglie un anno', () => {
    expect(tickContract({ yearsLeft: 3, signedInSeason: 1 }).yearsLeft).toBe(2);
  });

  it('non scende sotto zero', () => {
    expect(tickContract({ yearsLeft: 0, signedInSeason: 1 }).yearsLeft).toBe(0);
  });
});

describe('canLeave', () => {
  it("si può andare via nell'ultimo anno o a scadenza", () => {
    expect(canLeave({ yearsLeft: 0, signedInSeason: 1 })).toBe(true);
    expect(canLeave({ yearsLeft: 1, signedInSeason: 1 })).toBe(true);
  });

  it('a metà contratto si resta', () => {
    expect(canLeave({ yearsLeft: 3, signedInSeason: 1 })).toBe(false);
  });
});
