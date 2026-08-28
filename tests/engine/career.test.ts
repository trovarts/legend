import { describe, expect, it } from 'vitest';
import { runCareer, type CareerWorld } from '../../src/engine/career';
import type { CreatePlayerInput } from '../../src/engine/create';
import type { CandidateClub } from '../../src/engine/market';
import type { WorldPlayer } from '../../src/world/types';

const create: CreatePlayerInput = {
  name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1,
};

/** Un mondo con un club solo: nessuna offerta possibile, quindi la carriera resta lì. */
function world(overalls: readonly number[]): CareerWorld {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `p${index}`, name: `Compagno ${index}`, age: 26, role: 'FWD',
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  const only: CandidateClub = {
    club: { id: 'c1', name: 'Club di prova', squad },
    leagueId: 'serie-a-31', leagueName: 'Serie A', leagueLevel: 1,
  };
  return { clubs: [only], startClubId: 'c1' };
}

const average = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

describe('runCareer', () => {
  it('produce una carriera che finisce col ritiro', () => {
    const result = runCareer({ create, world: world([70, 68]), seed: 1 });
    expect(result.player.retired).toBe(true);
    expect(result.seasons.length).toBeGreaterThan(5);
    expect(result.retiredAt).toBe(result.player.age);
  });

  it("le stagioni sono numerate in ordine e l'età cresce di uno per volta", () => {
    const result = runCareer({ create, world: world([70, 68]), seed: 2 });
    result.seasons.forEach((season, index) => {
      expect(season.season).toBe(index + 1);
      expect(season.age).toBe(create.age + index);
    });
  });

  it('senza offerte si resta nello stesso club per tutta la carriera', () => {
    const result = runCareer({ create, world: world([70]), seed: 3 });
    for (const season of result.seasons) {
      expect(season.clubId).toBe('c1');
      expect(season.clubName).toBe('Club di prova');
      expect(season.leagueId).toBe('serie-a-31');
    }
    expect(result.clubsPlayed).toEqual(['Club di prova']);
  });

  it('il picco di overall è il massimo raggiunto nella carriera', () => {
    const result = runCareer({ create, world: world([70, 68]), seed: 4 });
    const maxFromSeasons = Math.max(...result.seasons.map((season) => season.overallEnd));
    expect(result.peakOverall).toBe(maxFromSeasons);
  });

  it('ogni stagione porta con sé statistiche e valore', () => {
    const result = runCareer({ create, world: world([70, 68]), seed: 5 });
    for (const season of result.seasons) {
      expect(season.stats.appearances).toBeGreaterThanOrEqual(0);
      expect(season.stats.minutes).toBeGreaterThanOrEqual(0);
      expect(season.valueEur).toBeGreaterThan(0);
      expect(season.position).toBeGreaterThanOrEqual(1);
    }
    expect(result.peakValueEur).toBeGreaterThan(0);
  });

  it('è deterministica: stesso seed, carriera identica', () => {
    const a = runCareer({ create, world: world([70, 68]), seed: 99 });
    const b = runCareer({ create, world: world([70, 68]), seed: 99 });
    expect(a).toEqual(b);
  });

  it('seed diversi danno carriere diverse', () => {
    const a = runCareer({ create, world: world([70, 68]), seed: 1 });
    const b = runCareer({ create, world: world([70, 68]), seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('in una squadra fortissima si gioca meno che in una debole', () => {
    const big = runCareer({ create, world: world([92, 90, 89, 88]), seed: 7 });
    const small = runCareer({ create, world: world([58, 55]), seed: 7 });
    expect(average(small.seasons.map((s) => s.minutesShare)))
      .toBeGreaterThan(average(big.seasons.map((s) => s.minutesShare)));
  });

  it('la carriera finisce a un\'età da calciatore', () => {
    const eta: number[] = [];
    for (let seed = 0; seed < 100; seed += 1) {
      const result = runCareer({ create, world: world([70, 68]), seed });
      expect(result.retiredAt).toBeGreaterThanOrEqual(28);
      expect(result.retiredAt).toBeLessThanOrEqual(41);
      eta.push(result.retiredAt);
    }
    const mediana = eta.sort((a, b) => a - b)[Math.floor(eta.length / 2)]!;
    expect(mediana).toBeGreaterThanOrEqual(32);
    expect(mediana).toBeLessThanOrEqual(36);
  });
});
