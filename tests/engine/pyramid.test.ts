import { describe, expect, it } from 'vitest';
import { clubStrength } from '../../src/engine/clubStrength';
import { buildLowerLeagues, countriesWithPyramid } from '../../src/engine/pyramid';

describe('le divisioni minori', () => {
  it('coprono i paesi principali', () => {
    expect(countriesWithPyramid()).toContain('Italy');
    expect(countriesWithPyramid().length).toBeGreaterThanOrEqual(5);
  });

  it('sono due livelli con tre gironi ciascuno', () => {
    const leghe = buildLowerLeagues('Italy', 7);
    expect(leghe).toHaveLength(6);
    expect(leghe.filter((lega) => lega.summary.level === 3)).toHaveLength(3);
    expect(leghe.filter((lega) => lega.summary.level === 4)).toHaveLength(3);
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
});
