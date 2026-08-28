import { describe, expect, it } from 'vitest';
import { AMBIZIONI, ambizioneById, progressoAmbizione } from '../../src/engine/ambizione';
import type { SeasonRecord } from '../../src/engine/types';

function stagione(over: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    season: 1, age: 20, clubId: 'c1', clubName: 'Club', leagueId: 'lg', leagueName: 'Lega',
    leagueLevel: 1, minutesShare: 0.8, overallStart: 70, overallEnd: 72,
    stats: { appearances: 34, minutes: 2900, goals: 10, assists: 4, cleanSheets: 0, rating: 6.8 },
    position: 5, trophies: [], awards: [],
    national: { capped: false, caps: 0, goals: 0, tournament: null },
    valueEur: 1_000_000, offers: [], injury: null, choices: [], marks: [],
    movement: null, playoffPlayed: false, cupRound: 0,
    ...over,
  };
}

const paese = (id: string): string | undefined =>
  ({ c1: 'Italy', c2: 'Spain', c3: 'England', c4: 'Brazil' })[id];

describe("l'ambizione di carriera", () => {
  it('ha un id diverso per ognuna, e «nessuna» non promette niente', () => {
    expect(new Set(AMBIZIONI.map((a) => a.id)).size).toBe(AMBIZIONI.length);
    expect(ambizioneById('nessuna').premio).toBe(0);
    expect(ambizioneById('sconosciuta').id).toBe('nessuna');
  });

  it('la bandiera conta le stagioni di fila, non quelle in totale', () => {
    const dodiciDiFila = Array.from({ length: 12 }, (_, i) => stagione({ season: i + 1 }));
    expect(progressoAmbizione(ambizioneById('bandiera'), dodiciDiFila, paese).centrata).toBe(true);

    const conUnaPausa = dodiciDiFila.map((s, i) => (i === 5 ? { ...s, clubId: 'c2' } : s));
    const progresso = progressoAmbizione(ambizioneById('bandiera'), conUnaPausa, paese);
    expect(progresso.centrata).toBe(false);
    expect(progresso.fatto).toBe(6);
  });

  it('il giramondo conta i paesi, non i club', () => {
    const quattroClubDueP = [
      stagione({ clubId: 'c1' }), stagione({ season: 2, clubId: 'c1' }),
      stagione({ season: 3, clubId: 'c2' }), stagione({ season: 4, clubId: 'c2' }),
    ];
    expect(progressoAmbizione(ambizioneById('giramondo'), quattroClubDueP, paese).fatto).toBe(2);

    const quattroPaesi = ['c1', 'c2', 'c3', 'c4'].map((clubId, i) => stagione({ season: i + 1, clubId }));
    expect(progressoAmbizione(ambizioneById('giramondo'), quattroPaesi, paese).centrata).toBe(true);
  });

  it('«dal nulla» vuole sia la partenza in basso sia il titolo in alto', () => {
    const titolo = [{ kind: 'league' as const, season: 9, competitionName: 'Serie A' }];
    const dalBasso = [
      stagione({ leagueLevel: 4 }),
      stagione({ season: 9, leagueLevel: 1, trophies: titolo }),
    ];
    expect(progressoAmbizione(ambizioneById('dal-nulla'), dalBasso, paese).centrata).toBe(true);

    const giaInAlto = [stagione({ leagueLevel: 1 }), stagione({ season: 9, leagueLevel: 1, trophies: titolo })];
    expect(progressoAmbizione(ambizioneById('dal-nulla'), giaInAlto, paese).centrata).toBe(false);
  });

  it('si legge anche a metà strada', () => {
    const tre = Array.from({ length: 3 }, (_, i) => stagione({ season: i + 1 }));
    const progresso = progressoAmbizione(ambizioneById('bandiera'), tre, paese);
    expect(progresso.fatto).toBe(3);
    expect(progresso.target).toBe(12);
    expect(progresso.centrata).toBe(false);
  });
});
