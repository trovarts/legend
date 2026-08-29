import { describe, expect, it } from 'vitest';
import { clubStrength } from '../../src/engine/clubStrength';
import { buildLowerLeagues, countriesWithPyramid, gironiDi } from '../../src/engine/pyramid';

describe('le divisioni minori', () => {
  it('coprono i paesi principali', () => {
    expect(countriesWithPyramid()).toContain('Italy');
    expect(countriesWithPyramid().length).toBeGreaterThanOrEqual(5);
  });

  it('la quarta serie italiana ha nove gironi, come la Serie D vera', () => {
    /*
     * È il motivo per cui i gironi si contano paese per paese: con tre soli, la
     * quarta serie italiana era un terzo di quella vera e la gavetta finiva subito.
     */
    const leghe = buildLowerLeagues('Italy', 7);
    expect(leghe.filter((lega) => lega.summary.level === 3)).toHaveLength(3);
    expect(leghe.filter((lega) => lega.summary.level === 4)).toHaveLength(9);
    expect(leghe).toHaveLength(12);

    const gironi = leghe
      .filter((lega) => lega.summary.level === 4)
      .map((lega) => lega.summary.name);
    expect(gironi[0]).toContain('Girone A');
    expect(gironi[8]).toContain('Girone I');
    expect(new Set(gironi).size).toBe(9);
  });

  it('l’Italia intera fa 262 club sulle quattro divisioni', () => {
    // 20 in Serie A, 20 in B dai dati veri, più le due categorie generate qui.
    const generati = buildLowerLeagues('Italy', 7)
      .reduce((somma, lega) => somma + lega.clubs.length, 0);
    expect(generati).toBe(222);
    expect(20 + 20 + generati).toBe(262);
  });

  it('un paese senza una forma dichiarata resta a tre gironi', () => {
    expect(gironiDi('France', 4)).toBe(3);
    expect(gironiDi('Italy', 4)).toBe(9);
    expect(buildLowerLeagues('France', 7).filter((lega) => lega.summary.level === 4))
      .toHaveLength(3);
  });

  it('ogni girone ha le squadre della sua categoria, con rose complete', () => {
    for (const lega of buildLowerLeagues('Italy', 7)) {
      expect(lega.clubs).toHaveLength(lega.summary.level === 3 ? 20 : 18);
      for (const club of lega.clubs) {
        expect(club.squad.length).toBeGreaterThanOrEqual(20);
        expect(club.squad.filter((giocatore) => giocatore.role === 'GK').length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('i nomi sono città vere con il soprannome, e non si ripetono', () => {
    const nomi = buildLowerLeagues('Italy', 7).flatMap((lega) => lega.clubs.map((club) => club.name));
    expect(new Set(nomi).size).toBe(nomi.length);
    expect(nomi.some((nome) => nome.startsWith('Pontedera'))).toBe(true);
  });

  it('più si scende, più le squadre sono deboli', () => {
    const leghe = buildLowerLeagues('Italy', 7);
    const media = (livello: number): number => {
      const club = leghe.filter((lega) => lega.summary.level === livello).flatMap((lega) => lega.clubs);
      return club.reduce((somma, uno) => somma + clubStrength(uno), 0) / club.length;
    };
    expect(media(3)).toBeGreaterThan(media(4) + 3);
  });

  it('sono deterministiche', () => {
    expect(buildLowerLeagues('Italy', 7)).toEqual(buildLowerLeagues('Italy', 7));
  });

  it('un paese senza città elencate non produce niente', () => {
    expect(buildLowerLeagues('Bolivia', 7)).toEqual([]);
  });

  it('si possono generare solo i livelli che al paese mancano davvero', () => {
    const leghe = buildLowerLeagues('Germany', 7, [4]);
    expect(leghe).toHaveLength(3);
    for (const lega of leghe) expect(lega.summary.level).toBe(4);
  });

  it('i comprimari hanno i nomi che si passano, senza doppioni in rosa', () => {
    const nomi = ['A. Rossi', 'B. Bianchi', 'C. Verdi', 'D. Neri', 'E. Gialli', 'F. Blu',
      'G. Grigi', 'H. Viola', 'I. Rosa', 'L. Aranci', 'M. Marroni', 'N. Argenti',
      'O. Oro', 'P. Bronzo', 'Q. Rame', 'R. Ferro', 'S. Acciaio', 'T. Zinco',
      'U. Piombo', 'V. Stagno', 'Z. Nichel', 'A. Cromo', 'B. Titanio', 'C. Platino'];
    const lega = buildLowerLeagues('Italy', 3, [4], {
      GK: nomi.slice(0, 6), DEF: nomi.slice(6, 12), MID: nomi.slice(12, 18), FWD: nomi.slice(18),
    })[0]!;
    for (const club of lega.clubs) {
      const inRosa = club.squad.map((giocatore) => giocatore.name);
      expect(new Set(inRosa).size).toBe(inRosa.length);
      for (const giocatore of club.squad) {
        expect(giocatore.nationality).toBe('Italy');
        expect(giocatore.valueEur).toBeGreaterThan(0);
      }
    }
  });
});
