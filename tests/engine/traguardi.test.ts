import { describe, expect, it } from 'vitest';
import { TRAGUARDI, traguardiDi } from '../../src/engine/traguardi';
import type { CareerResult, SeasonRecord } from '../../src/engine/types';

function stagione(over: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    season: 1, age: 20, clubId: 'c1', clubName: 'Club', leagueId: 'lg', leagueName: 'Lega',
    leagueLevel: 1, minutesShare: 0.8, overallStart: 70, overallEnd: 72,
    stats: { appearances: 34, minutes: 2900, goals: 12, assists: 6, cleanSheets: 0, rating: 7 },
    position: 5, trophies: [], awards: [],
    national: { capped: false, caps: 0, goals: 0, tournament: null },
    valueEur: 1_000_000, offers: [], injury: null, choices: [], marks: [],
    movement: null, playoffPlayed: false, cupRound: 0,
    ...over,
  };
}

function carriera(over: Partial<CareerResult> = {}): CareerResult {
  const seasons = over.seasons ?? [stagione()];
  return {
    player: {
      name: 'Diego', nationality: 'Italy', role: 'FWD', age: 35, overall: 70, potential: 80,
      physique: 60, peakAge: 28, seasonsPlayed: seasons.length, retired: true,
    },
    seasons,
    peakOverall: 72,
    retiredAt: 35,
    clubsPlayed: ['Club'],
    trophies: [],
    awards: [],
    peakValueEur: 1_000_000,
    totalCaps: 0,
    goat: { total: 400, components: {
      performance: 0, trophies: 0, awards: 0, national: 0, peakOverall: 0,
      peakValue: 0, longevity: 0, rival: 0, difficulty: 0,
    } },
    rival: { name: 'Rivale', clubName: 'Altro', peakOverall: 75, trophies: 2, goals: 100 },
    showdowns: [], choices: [], marks: [], injuries: [],
    seasonsAheadOfRival: 0,
    careerYearsBurned: 0,
    ...over,
  };
}

describe('i traguardi', () => {
  it('hanno tutti un id diverso', () => {
    expect(new Set(TRAGUARDI.map((t) => t.id)).size).toBe(TRAGUARDI.length);
  });

  it('una carriera qualunque non li sblocca tutti', () => {
    expect(traguardiDi(carriera()).length).toBeLessThan(TRAGUARDI.length / 2);
  });

  it('cento gol si contano su tutta la carriera, non su una stagione', () => {
    const dieci = Array.from({ length: 10 }, (_, i) => stagione({ season: i + 1 }));
    expect(traguardiDi(carriera({ seasons: dieci }))).toContain('centogol');
  });

  it('la bandiera vuole dieci stagioni di fila nello stesso club', () => {
    const nove = Array.from({ length: 9 }, (_, i) => stagione({ season: i + 1 }));
    expect(traguardiDi(carriera({ seasons: nove }))).not.toContain('bandiera');

    const dieci = Array.from({ length: 10 }, (_, i) => stagione({ season: i + 1 }));
    expect(traguardiDi(carriera({ seasons: dieci }))).toContain('bandiera');

    const cambio = dieci.map((s, i) => (i === 4 ? { ...s, clubId: 'altro' } : s));
    expect(traguardiDi(carriera({ seasons: cambio }))).not.toContain('bandiera');
  });

  it('la scalata vuole partire in basso e arrivare in alto', () => {
    const dalBasso = [stagione({ leagueLevel: 4 }), stagione({ season: 2, leagueLevel: 1 })];
    expect(traguardiDi(carriera({ seasons: dalBasso }))).toContain('scalata');

    const sempreInAlto = [stagione({ leagueLevel: 1 }), stagione({ season: 2, leagueLevel: 1 })];
    expect(traguardiDi(carriera({ seasons: sempreInAlto }))).not.toContain('scalata');
  });
});
