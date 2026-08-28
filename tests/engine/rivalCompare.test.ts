import { describe, expect, it } from 'vitest';
import { compareSeason, rollShowdown, seasonScoreOf } from '../../src/engine/rival';
import { createRng } from '../../src/engine/rng';
import type { SeasonRecord } from '../../src/engine/types';

function season(over: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    season: 3, age: 22, clubId: 'c', clubName: 'Club', leagueId: 'lg', leagueName: 'Lega',
    leagueLevel: 1, minutesShare: 0.8, overallStart: 70, overallEnd: 72,
    stats: { appearances: 30, minutes: 2500, goals: 10, assists: 5, cleanSheets: 0, rating: 7 },
    position: 5, trophies: [], awards: [],
    national: { capped: false, caps: 0, goals: 0, tournament: null },
    valueEur: 5_000_000, offers: [], injury: null, choices: [], marks: [],
    ...over,
  };
}

describe('seasonScoreOf', () => {
  it('premia gol, assist e voto', () => {
    const poor = seasonScoreOf(season({ stats: { appearances: 30, minutes: 2500, goals: 2, assists: 1, cleanSheets: 0, rating: 6.2 } }));
    const great = seasonScoreOf(season({ stats: { appearances: 30, minutes: 2500, goals: 20, assists: 10, cleanSheets: 0, rating: 7.9 } }));
    expect(great).toBeGreaterThan(poor);
  });

  it('premia i trofei', () => {
    const withTrophy = seasonScoreOf(season({
      trophies: [{ kind: 'league', season: 3, competitionName: 'Serie A' }],
    }));
    expect(withTrophy).toBeGreaterThan(seasonScoreOf(season()));
  });

  it('un portiere con molti clean sheet non è penalizzato', () => {
    const keeper = seasonScoreOf(season({
      stats: { appearances: 36, minutes: 3200, goals: 0, assists: 0, cleanSheets: 18, rating: 7.5 },
    }));
    expect(keeper).toBeGreaterThan(0);
  });
});

describe('compareSeason', () => {
  it('senza stagione del Rivale non produce confronto', () => {
    expect(compareSeason(season(), undefined, 'Tizio', 'Club')).toBeNull();
  });

  it('dice quando il Rivale è davanti', () => {
    const mine = season({ stats: { appearances: 30, minutes: 2500, goals: 3, assists: 1, cleanSheets: 0, rating: 6.3 } });
    const his = season({ stats: { appearances: 34, minutes: 3000, goals: 25, assists: 9, cleanSheets: 0, rating: 8 } });
    const snapshot = compareSeason(mine, his, 'Matteo Rinaldi', 'Real');
    expect(snapshot?.aheadOfYou).toBe(true);
    expect(snapshot?.name).toBe('Matteo Rinaldi');
    expect(snapshot?.goals).toBe(25);
  });

  it('dice quando sei davanti tu', () => {
    const mine = season({ stats: { appearances: 34, minutes: 3000, goals: 22, assists: 8, cleanSheets: 0, rating: 7.9 } });
    const his = season({ stats: { appearances: 20, minutes: 1200, goals: 2, assists: 1, cleanSheets: 0, rating: 6.2 } });
    expect(compareSeason(mine, his, 'Tizio', 'Club')?.aheadOfYou).toBe(false);
  });
});

describe('rollShowdown', () => {
  const top = season({ position: 2 });
  const mid = season({ position: 11 });

  it('niente scontro se uno dei due non è arrivato in alto', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      expect(rollShowdown(mid, top, createRng(seed))).toBeNull();
      expect(rollShowdown(top, mid, createRng(seed))).toBeNull();
    }
  });

  it("senza Rivale non c'è scontro", () => {
    expect(rollShowdown(top, undefined, createRng(1))).toBeNull();
  });

  it('quando entrambi sono in alto lo scontro può capitare', () => {
    let met = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      if (rollShowdown(top, top, createRng(seed))) met += 1;
    }
    expect(met).toBeGreaterThan(20);
    expect(met).toBeLessThan(180);
  });

  it('chi ha fatto la stagione migliore vince più spesso', () => {
    const strong = season({ position: 1, stats: { appearances: 36, minutes: 3200, goals: 28, assists: 10, cleanSheets: 0, rating: 8.4 } });
    const weak = season({ position: 4, stats: { appearances: 30, minutes: 2400, goals: 4, assists: 2, cleanSheets: 0, rating: 6.4 } });
    let wins = 0;
    let total = 0;
    for (let seed = 0; seed < 500; seed += 1) {
      const showdown = rollShowdown(strong, weak, createRng(seed));
      if (showdown) { total += 1; if (showdown.won) wins += 1; }
    }
    expect(total).toBeGreaterThan(0);
    expect(wins / total).toBeGreaterThan(0.6);
  });

  it('è deterministico', () => {
    expect(rollShowdown(top, top, createRng(5))).toEqual(rollShowdown(top, top, createRng(5)));
  });
});
