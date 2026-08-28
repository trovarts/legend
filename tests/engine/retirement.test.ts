import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng';
import { shouldRetire } from '../../src/engine/retirement';
import type { CareerPlayer } from '../../src/engine/types';

function playerAt(age: number, overall: number): CareerPlayer {
  return {
    name: 'Test', nationality: 'Italy', role: 'DEF', age, overall, potential: 90,
    physique: 60, peakAge: 28, seasonsPlayed: age - 17, retired: false,
  };
}

function retirementRate(age: number, overall: number, share: number): number {
  let retired = 0;
  for (let seed = 0; seed < 1000; seed += 1) {
    if (shouldRetire(playerAt(age, overall), share, createRng(seed))) retired += 1;
  }
  return retired / 1000;
}

describe('shouldRetire', () => {
  it('finché si è giovani gli anni non contano', () => {
    for (let age = 18; age < 28; age += 1) {
      expect(retirementRate(age, 55, 0.05)).toBe(0);
    }
  });

  it('fra i 28 e i 31 si smette solo se il campo è finito', () => {
    for (let age = 28; age <= 31; age += 1) {
      // Chi gioca resta, anche se non è un fenomeno.
      expect(retirementRate(age, 70, 0.8)).toBe(0);
      // Chi non gioca più esce dal professionismo prima dei trenta: succede.
      expect(retirementRate(age, 60, 0.03)).toBeGreaterThan(0.2);
    }
  });

  it('la maggior parte delle carriere finisce fra i 33 e i 36', () => {
    // Un titolare in salute non deve poter restare in campo per sempre: prima
    // le tre voci si sottraevano e la probabilità restava a zero fino ai quaranta.
    expect(retirementRate(33, 78, 0.85)).toBeGreaterThan(0.1);
    expect(retirementRate(36, 78, 0.85)).toBeGreaterThan(0.4);
  });

  it('a 40 anni ci si ritira sempre', () => {
    expect(retirementRate(40, 88, 0.9)).toBe(1);
  });

  it('un titolare forte a 33 anni di solito continua', () => {
    expect(retirementRate(33, 84, 0.9)).toBeLessThan(0.3);
  });

  it('una riserva a 35 anni si ritira spesso', () => {
    expect(retirementRate(35, 62, 0.05)).toBeGreaterThan(0.3);
  });

  it('più si invecchia, più è probabile', () => {
    expect(retirementRate(38, 70, 0.5)).toBeGreaterThan(retirementRate(34, 70, 0.5));
  });

  it('è deterministico', () => {
    const a = shouldRetire(playerAt(36, 70), 0.4, createRng(17));
    const b = shouldRetire(playerAt(36, 70), 0.4, createRng(17));
    expect(a).toBe(b);
  });
});
