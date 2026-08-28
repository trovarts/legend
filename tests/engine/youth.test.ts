import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng';
import { playYouthSeason, YOUTH_OPTIONS, youthOption } from '../../src/engine/youth';

const base = {
  year: 1, age: 14, clubName: 'Quevilly', overall: 40, potential: 80,
  approach: 'piano-completo' as const,
};

describe('le scelte del vivaio', () => {
  it('sono tre, e una sola è senza rischio', () => {
    expect(YOUTH_OPTIONS).toHaveLength(3);
    const certe = YOUTH_OPTIONS.filter((option) => option.outcomes.length === 1);
    expect(certe).toHaveLength(1);
  });

  it('ogni scommessa ha probabilità che sommano a uno', () => {
    for (const option of YOUTH_OPTIONS) {
      const totale = option.outcomes.reduce((sum, outcome) => sum + outcome.chance, 0);
      expect(totale).toBeCloseTo(1, 5);
    }
  });

  it('chi rischia di più può guadagnare di più', () => {
    const aggressivo = Math.max(...youthOption('forza-il-ritmo').outcomes.map((o) => o.overall));
    const sicuro = Math.max(...youthOption('proteggi-la-crescita').outcomes.map((o) => o.overall));
    expect(aggressivo).toBeGreaterThan(sicuro);
  });
});

describe('playYouthSeason', () => {
  it('produce una stagione da settore giovanile', () => {
    const season = playYouthSeason(base, createRng(1));
    expect(season.appearances).toBeGreaterThan(8);
    expect(season.appearances).toBeLessThanOrEqual(22);
    expect(season.rating).toBeGreaterThan(5);
    expect(season.rating).toBeLessThan(9);
  });

  it("l'approccio conservativo dà sempre un punto", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const season = playYouthSeason({ ...base, approach: 'proteggi-la-crescita' }, createRng(seed));
      expect(season.overallEnd - season.overallStart).toBe(1);
    }
  });

  it("l'approccio aggressivo a volte non dà niente, a volte molto", () => {
    const guadagni = new Set<number>();
    for (let seed = 0; seed < 60; seed += 1) {
      const season = playYouthSeason({ ...base, approach: 'forza-il-ritmo' }, createRng(seed));
      guadagni.add(season.overallEnd - season.overallStart);
    }
    expect(guadagni.has(0)).toBe(true);
    expect(guadagni.has(3)).toBe(true);
  });

  it('non si supera mai il proprio potenziale', () => {
    const season = playYouthSeason({ ...base, overall: 79, potential: 80, approach: 'forza-il-ritmo' }, createRng(2));
    expect(season.overallEnd).toBeLessThanOrEqual(80);
  });

  it('è deterministica', () => {
    expect(playYouthSeason(base, createRng(7))).toEqual(playYouthSeason(base, createRng(7)));
  });
});
