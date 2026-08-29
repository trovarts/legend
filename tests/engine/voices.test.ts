import { describe, expect, it } from 'vitest';
import { seasonVoices } from '../../src/engine/voices';
import type { SeasonRecord } from '../../src/engine/types';

const base: SeasonRecord = {
  season: 3, age: 20, clubId: 'c1', clubName: 'Bologna', leagueId: 'l1', leagueName: 'Prima',
  leagueLevel: 1, position: 9, overallStart: 66, overallEnd: 68, minutesShare: 0.6,
  stats: { appearances: 30, minutes: 2400, goals: 8, assists: 4, cleanSheets: 0, rating: 6.8 },
  injury: null, trophies: [], awards: [], choices: [], marks: [],
  national: { capped: false, caps: 0, goals: 0, tournament: null },
  movement: null,
} as unknown as SeasonRecord;

describe('le voci del giornale', () => {
  it('sono al massimo due e non sono mai vuote', () => {
    const voci = seasonVoices({ record: base, previous: undefined, isFirstSeason: false });
    expect(voci.length).toBeGreaterThan(0);
    expect(voci.length).toBeLessThanOrEqual(2);
    for (const voce of voci) {
      expect(voce.text.length).toBeGreaterThan(10);
      expect(voce.source.length).toBeGreaterThan(0);
    }
  });

  it('sono le stesse a parità di stagione: una carriera riletta è la stessa carriera', () => {
    const una = seasonVoices({ record: base, previous: undefined, isFirstSeason: false });
    const due = seasonVoices({ record: { ...base }, previous: undefined, isFirstSeason: false });
    expect(due).toEqual(una);
  });

  it('parlano di quello che è successo', () => {
    const fermo = { ...base, minutesShare: 0.05 };
    expect(seasonVoices({ record: fermo, previous: undefined, isFirstSeason: false })
      .some((voce) => voce.id === 'panchina')).toBe(true);

    const bomber = { ...base, stats: { ...base.stats, goals: 25 } };
    expect(seasonVoices({ record: bomber, previous: undefined, isFirstSeason: false })
      .some((voce) => voce.id === 'gol')).toBe(true);
  });

  it('non ripetono la stessa frase stagione dopo stagione', () => {
    /*
     * Vent'anni della stessa voce identica sono peggio del silenzio: è il difetto
     * che D-024 aveva trovato leggendo una carriera intera.
     */
    const frasi = new Set<string>();
    for (let stagione = 1; stagione <= 12; stagione += 1) {
      for (const voce of seasonVoices({
        record: { ...base, season: stagione, age: 17 + stagione },
        previous: undefined, isFirstSeason: false,
      })) frasi.add(voce.text);
    }
    expect(frasi.size).toBeGreaterThan(1);
  });
});
