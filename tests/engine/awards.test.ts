import { describe, expect, it } from 'vitest';
import { resolveAwards, type AwardsInput } from '../../src/engine/awards.js';
import { createRng } from '../../src/engine/rng.js';
import type { SeasonStats } from '../../src/engine/types.js';

function stats(goals: number, assists = 5, rating = 7.2): SeasonStats {
  return { appearances: 34, minutes: 2900, goals, assists, cleanSheets: 0, rating };
}

const base: AwardsInput = {
  season: 4, leagueName: 'Serie A', leagueLevel: 1, age: 26, role: 'FWD',
  stats: stats(12), position: 5,
};

function rate(input: AwardsInput, kind: string): number {
  let won = 0;
  for (let seed = 0; seed < 1000; seed += 1) {
    if (resolveAwards(input, createRng(seed)).some((a) => a.kind === kind)) won += 1;
  }
  return won / 1000;
}

describe('resolveAwards', () => {
  it('chi segna tantissimo diventa spesso capocannoniere', () => {
    expect(rate({ ...base, stats: stats(28) }, 'topScorer')).toBeGreaterThan(0.5);
  });

  it('con dodici gol il titolo di capocannoniere è raro', () => {
    expect(rate(base, 'topScorer')).toBeLessThan(0.1);
  });

  it('servono più gol in Serie A che in quarta divisione', () => {
    const top = rate({ ...base, stats: stats(20), leagueLevel: 1 }, 'topScorer');
    const low = rate({ ...base, stats: stats(20), leagueLevel: 4 }, 'topScorer');
    expect(low).toBeGreaterThan(top);
  });

  it('il premio di miglior giocatore chiede una grande stagione e una grande squadra', () => {
    const winner = rate({ ...base, stats: stats(22, 10, 8.2), position: 1 }, 'leagueMvp');
    const midTable = rate({ ...base, stats: stats(22, 10, 8.2), position: 12 }, 'leagueMvp');
    expect(winner).toBeGreaterThan(midTable);
    expect(winner).toBeGreaterThan(0.15);
  });

  it('il premio giovani va solo agli under 22', () => {
    expect(rate({ ...base, age: 21, stats: stats(15, 8, 7.6) }, 'youngPlayer')).toBeGreaterThan(0.1);
    expect(rate({ ...base, age: 25, stats: stats(15, 8, 7.6) }, 'youngPlayer')).toBe(0);
  });

  it('un portiere non vince il titolo di capocannoniere', () => {
    const keeper: AwardsInput = {
      ...base, role: 'GK',
      stats: { appearances: 38, minutes: 3420, goals: 0, assists: 0, cleanSheets: 18, rating: 7.8 },
    };
    expect(rate(keeper, 'topScorer')).toBe(0);
  });

  it('un portiere può comunque essere il migliore del campionato', () => {
    const keeper: AwardsInput = {
      ...base, role: 'GK', position: 1,
      stats: { appearances: 38, minutes: 3420, goals: 0, assists: 0, cleanSheets: 21, rating: 8.3 },
    };
    expect(rate(keeper, 'leagueMvp')).toBeGreaterThan(0.1);
  });

  it('una stagione da riserva non vince niente', () => {
    const bench: AwardsInput = {
      ...base,
      stats: { appearances: 4, minutes: 180, goals: 1, assists: 0, cleanSheets: 0, rating: 6.1 },
    };
    for (let seed = 0; seed < 200; seed += 1) {
      expect(resolveAwards(bench, createRng(seed))).toEqual([]);
    }
  });

  it('è deterministico', () => {
    expect(resolveAwards(base, createRng(8))).toEqual(resolveAwards(base, createRng(8)));
  });
});
