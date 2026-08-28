import { describe, expect, it } from 'vitest';
import { computeGoatScore, type GoatInput } from '../../src/engine/goatScore';
import type { SeasonRecord } from '../../src/engine/types';

function season(goals: number, rating = 7, cleanSheets = 0): SeasonRecord {
  return {
    season: 1, age: 24, clubId: 'c', clubName: 'Club', leagueId: 'lg', leagueName: 'Lega',
    leagueLevel: 1, minutesShare: 0.8, overallStart: 75, overallEnd: 76,
    stats: { appearances: 32, minutes: 2800, goals, assists: 5, cleanSheets, rating },
    position: 4, trophies: [], awards: [],
    national: { capped: true, caps: 6, goals: 2, tournament: null },
    valueEur: 20_000_000, offers: [], injury: null, choices: [], marks: [], movement: null, playoffPlayed: false, cupRound: 0,
  };
}

const modest: GoatInput = {
  role: 'FWD',
  seasons: Array.from({ length: 12 }, () => season(6, 6.5)),
  trophies: [], awards: [], peakOverall: 68, peakValueEur: 3_000_000,
  totalCaps: 0, startingLeagueLevel: 1, showdowns: [], seasonsAheadOfRival: 3,
};

const legend: GoatInput = {
  role: 'FWD',
  seasons: Array.from({ length: 18 }, () => season(24, 8)),
  trophies: Array.from({ length: 12 }, (_, i) => ({
    kind: 'league' as const, season: i, competitionName: 'Serie A',
  })),
  awards: Array.from({ length: 5 }, (_, i) => ({
    kind: 'topScorer' as const, season: i, competitionName: 'Serie A',
  })),
  peakOverall: 92, peakValueEur: 150_000_000, totalCaps: 110,
  startingLeagueLevel: 1, showdowns: [{ season: 8, competition: 'Coppa', won: true }],
  seasonsAheadOfRival: 15,
};

describe('computeGoatScore', () => {
  it('una leggenda sta molto sopra un onesto professionista', () => {
    expect(computeGoatScore(legend).total).toBeGreaterThan(computeGoatScore(modest).total * 2);
  });

  it('il totale resta fra 0 e 1000', () => {
    for (const input of [modest, legend]) {
      const score = computeGoatScore(input);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(1000);
    }
  });

  it('ogni componente resta fra 0 e 100', () => {
    for (const value of Object.values(computeGoatScore(legend).components)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('un portiere non è penalizzato dai gol che non fa', () => {
    const keeperSeasons = Array.from({ length: 18 }, () => season(0, 8, 18));
    const keeper = computeGoatScore({ ...legend, role: 'GK', seasons: keeperSeasons });
    const striker = computeGoatScore(legend);
    expect(keeper.components.performance).toBeGreaterThan(striker.components.performance * 0.7);
  });

  it('partire dalla quarta divisione vale più che partire dalla prima', () => {
    expect(computeGoatScore({ ...legend, startingLeagueLevel: 4 }).total)
      .toBeGreaterThan(computeGoatScore({ ...legend, startingLeagueLevel: 1 }).total);
  });

  it('battere il Rivale conta', () => {
    expect(computeGoatScore({ ...legend, seasonsAheadOfRival: 18 }).total)
      .toBeGreaterThan(computeGoatScore({ ...legend, seasonsAheadOfRival: 0 }).total);
  });

  it('vincere gli scontri diretti conta', () => {
    const won = computeGoatScore({ ...legend, showdowns: [{ season: 5, competition: 'Coppa', won: true }] });
    const lost = computeGoatScore({ ...legend, showdowns: [{ season: 5, competition: 'Coppa', won: false }] });
    expect(won.components.rival).toBeGreaterThan(lost.components.rival);
  });

  it('una carriera vuota non produce errori né punteggi negativi', () => {
    const empty = computeGoatScore({
      role: 'MID', seasons: [], trophies: [], awards: [], peakOverall: 0,
      peakValueEur: 0, totalCaps: 0, startingLeagueLevel: 1, showdowns: [], seasonsAheadOfRival: 0,
    });
    expect(empty.total).toBeGreaterThanOrEqual(0);
  });

  it('è deterministico: nessuna casualità nel verdetto', () => {
    expect(computeGoatScore(legend)).toEqual(computeGoatScore(legend));
  });
});
