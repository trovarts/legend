import { describe, expect, it } from 'vitest';
import { runCareer } from '../../src/engine/career.js';
import type { CreatePlayerInput } from '../../src/engine/create.js';
import type { Club, WorldPlayer } from '../../src/world/types.js';

const create: CreatePlayerInput = {
  name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1,
};

function club(overalls: readonly number[]): Club {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `p${index}`, name: `Compagno ${index}`, age: 26, role: 'FWD',
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id: 'c1', name: 'Club di prova', squad };
}

describe('runCareer', () => {
  it('produce una carriera che finisce col ritiro', () => {
    const result = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 1 });
    expect(result.player.retired).toBe(true);
    expect(result.seasons.length).toBeGreaterThan(5);
    expect(result.retiredAt).toBe(result.player.age);
  });

  it("le stagioni sono numerate in ordine e l'età cresce di uno per volta", () => {
    const result = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 2 });
    result.seasons.forEach((season, index) => {
      expect(season.season).toBe(index + 1);
      expect(season.age).toBe(create.age + index);
    });
  });

  it('registra il club e il campionato in ogni stagione', () => {
    const result = runCareer({ create, club: club([70]), leagueId: 'serie-a-31', seed: 3 });
    for (const season of result.seasons) {
      expect(season.clubId).toBe('c1');
      expect(season.clubName).toBe('Club di prova');
      expect(season.leagueId).toBe('serie-a-31');
    }
  });

  it('il picco di overall è il massimo raggiunto nella carriera', () => {
    const result = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 4 });
    const maxFromSeasons = Math.max(...result.seasons.map((season) => season.overallEnd));
    expect(result.peakOverall).toBe(maxFromSeasons);
  });

  it('è deterministica: stesso seed, carriera identica', () => {
    const a = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 99 });
    const b = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 99 });
    expect(a).toEqual(b);
  });

  it('seed diversi danno carriere diverse', () => {
    const a = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 1 });
    const b = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('in una squadra fortissima si gioca meno che in una debole', () => {
    const big = runCareer({ create, club: club([92, 90, 89, 88]), leagueId: 'x', seed: 7 });
    const small = runCareer({ create, club: club([58, 55]), leagueId: 'x', seed: 7 });
    const average = (values: readonly number[]): number =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average(small.seasons.map((s) => s.minutesShare)))
      .toBeGreaterThan(average(big.seasons.map((s) => s.minutesShare)));
  });

  it('non si ritira mai prima dei 30 anni', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const result = runCareer({ create, club: club([70, 68]), leagueId: 'x', seed });
      expect(result.retiredAt).toBeGreaterThanOrEqual(30);
      expect(result.retiredAt).toBeLessThanOrEqual(41);
    }
  });
});
