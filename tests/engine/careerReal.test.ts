import { beforeAll, describe, expect, it } from 'vitest';
import { runCareer } from '../../src/engine/career';
import type { CandidateClub } from '../../src/engine/market';
import { createFileWorldSource } from '../../src/world/fileSource';

describe('carriere sulle rose vere', () => {
  let clubs: CandidateClub[];
  let napoliId: string;

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const leagues = await source.listLeagues();
    const italian = leagues.filter((league) => league.country === 'Italy');
    clubs = [];
    for (const league of italian) {
      const bundle = await source.loadLeague(league.id);
      for (const club of bundle.clubs) {
        clubs.push({
          club,
          leagueId: league.id,
          leagueName: league.name,
          leagueLevel: league.level,
          country: league.country,
        });
      }
    }
    napoliId = clubs.find((entry) => entry.club.name === 'Napoli')!.club.id;
  });

  it('un ragazzo bloccato in una big finisce per cambiare aria', () => {
    let moved = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      const result = runCareer({
        create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
        world: { clubs, startClubId: napoliId },
        seed,
      });
      if (result.clubsPlayed.length > 1) moved += 1;
    }
    expect(moved).toBeGreaterThan(30);
  });

  it('una carriera vera produce gol, presenze e qualche trofeo', () => {
    const result = runCareer({
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
      world: { clubs, startClubId: napoliId },
      seed: 2026,
    });
    const goals = result.seasons.reduce((sum, season) => sum + season.stats.goals, 0);
    const apps = result.seasons.reduce((sum, season) => sum + season.stats.appearances, 0);
    expect(apps).toBeGreaterThan(100);
    expect(goals).toBeGreaterThan(20);
    expect(result.peakValueEur).toBeGreaterThan(1_000_000);
  });

  it('i minuti medi di una carriera sono da calciatore, non da spettatore', () => {
    let total = 0;
    const careers = 40;
    for (let seed = 0; seed < careers; seed += 1) {
      const result = runCareer({
        create: { name: 'Diego', nationality: 'Italy', role: 'MID', age: 17, leagueLevel: 1 },
        world: { clubs, startClubId: napoliId },
        seed,
      });
      total +=
        result.seasons.reduce((sum, season) => sum + season.minutesShare, 0) /
        result.seasons.length;
    }
    expect(total / careers).toBeGreaterThan(0.45);
  });

  it('è deterministica anche col mercato di mezzo', () => {
    const run = (): unknown =>
      runCareer({
        create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
        world: { clubs, startClubId: napoliId },
        seed: 77,
      });
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
