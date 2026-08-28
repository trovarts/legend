import { beforeAll, describe, expect, it } from 'vitest';
import { runCareer } from '../../src/engine/career';
import type { CandidateClub } from '../../src/engine/market';
import { createFileWorldSource } from '../../src/world/fileSource';

describe('la carriera completa', () => {
  let clubs: CandidateClub[];
  let startId: string;

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const leagues = await source.listLeagues();
    clubs = [];
    for (const league of leagues.slice(0, 6)) {
      const bundle = await source.loadLeague(league.id);
      for (const club of bundle.clubs) {
        clubs.push({ club, leagueId: league.id, leagueName: league.name, leagueLevel: league.level });
      }
    }
    startId = clubs[0]!.club.id;
  });

  function career(seed: number) {
    return runCareer({
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
      world: { clubs, startClubId: startId },
      seed,
    });
  }

  it('produce un punteggio GOAT sensato', () => {
    const result = career(1);
    expect(result.goat.total).toBeGreaterThan(0);
    expect(result.goat.total).toBeLessThanOrEqual(1000);
    expect(Object.keys(result.goat.components)).toHaveLength(9);
  });

  it('il Rivale ha vissuto la sua carriera in parallelo', () => {
    const result = career(2);
    expect(result.rival.name.length).toBeGreaterThan(2);
    expect(result.rival.peakOverall).toBeGreaterThan(40);
    expect(result.seasonsAheadOfRival).toBeGreaterThanOrEqual(0);
    expect(result.seasonsAheadOfRival).toBeLessThanOrEqual(result.seasons.length);
  });

  it('lungo la carriera si prendono decisioni', () => {
    expect(career(3).choices.length).toBeGreaterThan(3);
  });

  it('le scelte lasciano Segni', () => {
    let withMarks = 0;
    for (let seed = 0; seed < 30; seed += 1) {
      if (career(seed).seasons.some((season) => season.marks.length > 0)) withMarks += 1;
    }
    expect(withMarks).toBeGreaterThan(20);
  });

  it('qualcuno si fa male, durante una carriera intera', () => {
    let withInjuries = 0;
    for (let seed = 0; seed < 30; seed += 1) {
      if (career(seed).injuries.length > 0) withInjuries += 1;
    }
    expect(withInjuries).toBeGreaterThan(20);
  });

  it('il contratto frena il mercato: non si cambia squadra ogni anno', () => {
    let total = 0;
    for (let seed = 0; seed < 30; seed += 1) total += career(seed).clubsPlayed.length;
    expect(total / 30).toBeLessThan(7);
  });

  it('è deterministica, Rivale compreso', () => {
    expect(JSON.stringify(career(77))).toBe(JSON.stringify(career(77)));
  });
});
