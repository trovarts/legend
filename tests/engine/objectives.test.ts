import { describe, expect, it } from 'vitest';
import { judgeObjectives, seasonObjectives } from '../../src/engine/objectives';
import { createRng } from '../../src/engine/rng';

const base = { clubCount: 20, role: 'FWD' as const, cupName: 'Coppa Italiana' };

describe('gli obiettivi del club', () => {
  it('alla corazzata si chiede il titolo, alla piccola la salvezza', () => {
    const grande = seasonObjectives({ ...base, expectedPosition: 1 }, createRng(1));
    expect(grande.primary.kind).toBe('titolo');

    const piccola = seasonObjectives({ ...base, expectedPosition: 18 }, createRng(1));
    expect(piccola.primary.kind).toBe('salvezza');
  });

  it('a metà classifica si chiede un posto in più di quello atteso', () => {
    const obiettivi = seasonObjectives({ ...base, expectedPosition: 10 }, createRng(1));
    expect(obiettivi.primary.kind).toBe('piazzamento');
    expect(obiettivi.primary.target).toBe(9);
    expect(obiettivi.primary.text).toContain('9°');
  });

  it("l'obiettivo personale parla del ruolo e cambia col sorteggio", () => {
    const tipi = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      tipi.add(seasonObjectives({ ...base, expectedPosition: 8 }, createRng(seed)).secondary.kind);
    }
    expect(tipi.size).toBeGreaterThan(1);
    expect(tipi.has('gol')).toBe(true);
  });

  it('la coppa nazionale è chiamata col suo nome vero', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const obiettivo = seasonObjectives({ ...base, expectedPosition: 8 }, createRng(seed)).secondary;
      if (obiettivo.kind === 'coppa') {
        expect(obiettivo.text).toContain('coppa italiana');
        return;
      }
    }
    throw new Error('nessun obiettivo di coppa in quaranta sorteggi');
  });

  it('il verdetto guarda il piazzamento e i numeri personali', () => {
    const obiettivi = {
      primary: { kind: 'piazzamento' as const, text: '', target: 9 },
      secondary: { kind: 'gol' as const, text: '', target: 8 },
    };
    const stats = { appearances: 30, minutes: 2400, goals: 9, assists: 3, cleanSheets: 0, rating: 6.8 };

    expect(
      judgeObjectives(obiettivi, { position: 7, cupRound: 0, minutesShare: 0.7, stats, capped: false }),
    ).toEqual({ primary: true, secondary: true });

    expect(
      judgeObjectives(obiettivi, {
        position: 14, cupRound: 0, minutesShare: 0.7,
        stats: { ...stats, goals: 3 }, capped: false,
      }),
    ).toEqual({ primary: false, secondary: false });
  });
});
