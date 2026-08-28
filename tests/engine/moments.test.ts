import { describe, expect, it } from 'vitest';
import { seasonMoments } from '../../src/engine/moments';
import type { SeasonRecord } from '../../src/engine/types';

function record(over: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    season: 3, age: 22, clubId: 'c', clubName: 'Atalanta', leagueId: 'lg', leagueName: 'Serie A',
    leagueLevel: 1, minutesShare: 0.7, overallStart: 68, overallEnd: 71,
    stats: { appearances: 30, minutes: 2400, goals: 9, assists: 4, cleanSheets: 0, rating: 6.9 },
    position: 6, trophies: [], awards: [],
    national: { capped: false, caps: 0, goals: 0, tournament: null },
    valueEur: 8_000_000, offers: [], injury: null, choices: [], marks: [], movement: null, playoffPlayed: false, cupRound: 0,
    ...over,
  };
}

const base = { record: record(), isFirstSeason: false, previous: undefined, playerName: 'Diego' };

describe('seasonMoments', () => {
  it('non lascia mai una stagione senza racconto', () => {
    const moments = seasonMoments(base);
    expect(moments.length).toBeGreaterThanOrEqual(2);
    expect(moments.length).toBeLessThanOrEqual(5);
    for (const moment of moments) expect(moment.text.length).toBeGreaterThan(15);
  });

  it("la prima stagione racconta l'esordio", () => {
    expect(seasonMoments({ ...base, isFirstSeason: true }).some((m) => m.id === 'esordio')).toBe(true);
  });

  it('un titolo di campione è il momento più alto della stagione', () => {
    const moments = seasonMoments({
      ...base,
      record: record({ position: 1, trophies: [{ kind: 'league', season: 3, competitionName: 'Serie A' }] }),
    });
    expect(moments[0]?.id).toBe('trofeo');
    expect(moments[0]?.tone).toBe('alto');
  });

  it('un infortunio grave viene raccontato', () => {
    const moments = seasonMoments({
      ...base, record: record({ injury: { severity: 'grave', matchesOut: 26, season: 3 } }),
    });
    const injury = moments.find((m) => m.id === 'infortunio');
    expect(injury).toBeDefined();
    expect(injury?.tone).toBe('basso');
    expect(injury?.text).toContain('26');
  });

  it('una stagione da riserva non viene spacciata per un successo', () => {
    const moments = seasonMoments({
      ...base,
      record: record({
        minutesShare: 0.06,
        stats: { appearances: 4, minutes: 150, goals: 0, assists: 0, cleanSheets: 0, rating: 6 },
      }),
    });
    expect(moments.some((m) => m.tone === 'basso')).toBe(true);
  });

  it("un salto di rendimento rispetto all'anno prima viene notato", () => {
    const moments = seasonMoments({
      ...base,
      record: record({ stats: { appearances: 34, minutes: 3000, goals: 22, assists: 6, cleanSheets: 0, rating: 7.5 } }),
      previous: record({ stats: { appearances: 30, minutes: 2000, goals: 5, assists: 2, cleanSheets: 0, rating: 6.4 } }),
    });
    expect(moments.some((m) => m.id === 'esplosione')).toBe(true);
  });

  it('i premi individuali compaiono', () => {
    const moments = seasonMoments({
      ...base, record: record({ awards: [{ kind: 'topScorer', season: 3, competitionName: 'Serie A' }] }),
    });
    expect(moments.some((m) => m.id === 'premio')).toBe(true);
  });

  it('la convocazione in nazionale è un momento', () => {
    const moments = seasonMoments({
      ...base, record: record({ national: { capped: true, caps: 7, goals: 2, tournament: null } }),
    });
    expect(moments.some((m) => m.id === 'nazionale')).toBe(true);
  });

  it('è deterministico: stessi fatti, stesso racconto', () => {
    expect(seasonMoments(base)).toEqual(seasonMoments(base));
  });

  it('il salto di categoria è la notizia della stagione', () => {
    const salito = seasonMoments({
      ...base, record: record({ movement: 'promosso', position: 2 }),
    });
    expect(salito[0]?.id).toBe('promozione');

    const sceso = seasonMoments({ ...base, record: record({ movement: 'retrocesso', position: 20 }) });
    expect(sceso.some((m) => m.id === 'retrocessione' && m.tone === 'basso')).toBe(true);
  });

  it('«mai così tanti» vale solo guardando tutte le stagioni di prima', () => {
    const before = [
      record({ season: 1, stats: { appearances: 30, minutes: 2400, goals: 4, assists: 2, cleanSheets: 0, rating: 6.2 } }),
      record({ season: 2, stats: { appearances: 32, minutes: 2600, goals: 6, assists: 3, cleanSheets: 0, rating: 6.3 } }),
    ];
    const conStoria = seasonMoments({
      ...base,
      record: record({ season: 3, stats: { appearances: 34, minutes: 2900, goals: 11, assists: 3, cleanSheets: 0, rating: 6.6 } }),
      before,
    });
    expect(conStoria.some((m) => m.id === 'record-gol')).toBe(true);

    // Senza la storia non si può dire «mai»: la frase non compare.
    const senzaStoria = seasonMoments({
      ...base,
      record: record({ season: 3, stats: { appearances: 34, minutes: 2900, goals: 11, assists: 3, cleanSheets: 0, rating: 6.6 } }),
    });
    expect(senzaStoria.some((m) => m.id === 'record-gol')).toBe(false);
  });

  it("l'infortunio è raccontato in italiano corretto", () => {
    for (const severity of ['lieve', 'seria', 'grave'] as const) {
      const testi = seasonMoments({
        ...base, record: record({ injury: { severity, matchesOut: 6, season: 3 } }),
      }).map((m) => m.text);
      expect(testi.some((testo) => /Infortunio (lieve|serio|grave):/.test(testo))).toBe(true);
    }
  });

  it('lo stesso racconto non si ripete uguale ogni anno', () => {
    const numeri = [1, 2, 3].map((season) =>
      seasonMoments({ ...base, record: record({ season }) })
        .find((m) => m.id === 'numeri')?.text,
    );
    expect(new Set(numeri).size).toBe(3);
  });
});
