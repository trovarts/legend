import { describe, expect, it } from 'vitest';
import { injuryMinutesPenalty, rollInjury, type InjuryInput } from '../../src/engine/injuries';
import { addMark } from '../../src/engine/marks';
import { createRng } from '../../src/engine/rng';

const healthy: InjuryInput = { season: 5, age: 24, physique: 70, minutesShare: 0.8, marks: [] };

function injuryRate(input: InjuryInput): number {
  let hurt = 0;
  for (let seed = 0; seed < 2000; seed += 1) {
    if (rollInjury(input, createRng(seed))) hurt += 1;
  }
  return hurt / 2000;
}

describe('rollInjury', () => {
  it('un titolare sano si infortuna qualche volta, non ogni anno', () => {
    const rate = injuryRate(healthy);
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.35);
  });

  it('chi non gioca non si fa male', () => {
    expect(injuryRate({ ...healthy, minutesShare: 0.02 })).toBeLessThan(0.02);
  });

  it('a trentasei anni ci si fa male più che a ventiquattro', () => {
    expect(injuryRate({ ...healthy, age: 36 })).toBeGreaterThan(injuryRate(healthy) + 0.05);
  });

  it('un fisico di ferro protegge', () => {
    expect(injuryRate({ ...healthy, physique: 90 }))
      .toBeLessThan(injuryRate({ ...healthy, physique: 45 }));
  });

  it('il ginocchio fragile fa ricadere', () => {
    const fragile = { ...healthy, marks: addMark([], 'ginocchio-fragile', 1, 1) };
    expect(injuryRate(fragile)).toBeGreaterThan(injuryRate(healthy) + 0.03);
  });

  it('gli infortuni gravi sono rari, quelli lievi comuni', () => {
    const counts = { lieve: 0, seria: 0, grave: 0 };
    for (let seed = 0; seed < 5000; seed += 1) {
      const injury = rollInjury(healthy, createRng(seed));
      if (injury) counts[injury.severity] += 1;
    }
    const total = counts.lieve + counts.seria + counts.grave;
    expect(counts.lieve / total).toBeGreaterThan(0.5);
    expect(counts.grave / total).toBeLessThan(0.15);
  });

  it("l'infortunio dice quante partite si saltano e in che stagione", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const injury = rollInjury(healthy, createRng(seed));
      if (!injury) continue;
      expect(injury.matchesOut).toBeGreaterThan(0);
      expect(injury.matchesOut).toBeLessThanOrEqual(34);
      expect(injury.season).toBe(5);
    }
  });

  it('è deterministico', () => {
    expect(rollInjury(healthy, createRng(3))).toEqual(rollInjury(healthy, createRng(3)));
  });
});

describe('injuryMinutesPenalty', () => {
  it('senza infortuni non si perde niente', () => {
    expect(injuryMinutesPenalty(null)).toBe(0);
  });

  it('più partite si saltano, più stagione si perde', () => {
    const light = injuryMinutesPenalty({ severity: 'lieve', matchesOut: 3, season: 1 });
    const heavy = injuryMinutesPenalty({ severity: 'grave', matchesOut: 30, season: 1 });
    expect(heavy).toBeGreaterThan(light);
    expect(heavy).toBeLessThanOrEqual(1);
  });
});
