import { describe, expect, it } from 'vitest';
import { nationalSeason, type NationalInput } from '../../src/engine/national.js';
import { createRng } from '../../src/engine/rng.js';
import type { SeasonStats } from '../../src/engine/types.js';

const bigSeason: SeasonStats = {
  appearances: 34, minutes: 2900, goals: 16, assists: 8, cleanSheets: 0, rating: 7.7,
};
const poorSeason: SeasonStats = {
  appearances: 12, minutes: 500, goals: 1, assists: 0, cleanSheets: 0, rating: 6.2,
};

const base: NationalInput = {
  season: 5, age: 25, overall: 82, role: 'FWD', stats: bigSeason,
  leagueLevel: 1, alreadyCapped: false,
};

function callUpRate(input: NationalInput): number {
  let capped = 0;
  for (let seed = 0; seed < 500; seed += 1) {
    if (nationalSeason(input, createRng(seed)).capped) capped += 1;
  }
  return capped / 500;
}

describe('nationalSeason', () => {
  it('un big in una grande stagione viene convocato quasi sempre', () => {
    expect(callUpRate(base)).toBeGreaterThan(0.8);
  });

  it('un giocatore di quarta divisione non viene convocato', () => {
    expect(callUpRate({ ...base, overall: 58, leagueLevel: 4, stats: poorSeason })).toBeLessThan(0.05);
  });

  it('chi è già nel giro resta più facilmente', () => {
    const newcomer = callUpRate({ ...base, overall: 74, stats: poorSeason, alreadyCapped: false });
    const veteran = callUpRate({ ...base, overall: 74, stats: poorSeason, alreadyCapped: true });
    expect(veteran).toBeGreaterThan(newcomer);
  });

  it('chi non è convocato non ha né presenze né gol né tornei', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const result = nationalSeason(
        { ...base, overall: 55, leagueLevel: 4, stats: poorSeason }, createRng(seed),
      );
      if (!result.capped) {
        expect(result.caps).toBe(0);
        expect(result.goals).toBe(0);
        expect(result.tournament).toBeNull();
      }
    }
  });

  it('il torneo si gioca solo negli anni pari della carriera', () => {
    const even = nationalSeason({ ...base, season: 6 }, createRng(1));
    const odd = nationalSeason({ ...base, season: 7 }, createRng(1));
    expect(even.tournament).not.toBeNull();
    expect(odd.tournament).toBeNull();
  });

  it('la fase raggiunta è una di quelle previste', () => {
    const stages = ['gironi', 'ottavi', 'quarti', 'semifinale', 'finale', 'vittoria'];
    for (let seed = 0; seed < 200; seed += 1) {
      const result = nationalSeason({ ...base, season: 4 }, createRng(seed));
      if (result.tournament) expect(stages).toContain(result.tournament.stageReached);
    }
  });

  it('i portieri non segnano in nazionale', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      expect(nationalSeason({ ...base, role: 'GK' }, createRng(seed)).goals).toBe(0);
    }
  });

  it('è deterministico', () => {
    expect(nationalSeason(base, createRng(4))).toEqual(nationalSeason(base, createRng(4)));
  });
});
