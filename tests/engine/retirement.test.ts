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
  it('sotto i 32 anni non ci si ritira mai', () => {
    for (let age = 18; age < 32; age += 1) {
      expect(retirementRate(age, 55, 0.05)).toBe(0);
    }
  });

  it('a 40 anni ci si ritira sempre', () => {
    expect(retirementRate(40, 88, 0.9)).toBe(1);
  });

  it('un titolare forte a 33 anni quasi non si ritira', () => {
    expect(retirementRate(33, 84, 0.9)).toBeLessThan(0.05);
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
