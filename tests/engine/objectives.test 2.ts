import { describe, expect, it } from 'vitest';
import { judgeObjectives, seasonObjectives } from '../../src/engine/objectives';
import { createRng } from '../../src/engine/rng';
import { seasonStats } from '../../src/engine/stats';

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

  it('ogni obiettivo personale è raggiungibile dal ruolo a cui viene chiesto', () => {
    // Un obiettivo che il modello non può produrre non è difficile: è rotto.
    // Chiedere «media 6.8» a un difensore lo era.
    for (const role of ['GK', 'DEF', 'MID', 'FWD'] as const) {
      const migliori = { rating: 0, goals: 0, assists: 0, cleanSheets: 0, minutesShare: 0 };
      for (let seed = 0; seed < 200; seed += 1) {
        const stats = seasonStats(
          { overall: 85, role, minutesShare: 0.92, clubStrength: 82, leagueLevel: 1, teamPosition: 2, clubCount: 20 },
          createRng(seed),
        );
        migliori.rating = Math.max(migliori.rating, stats.rating);
        migliori.goals = Math.max(migliori.goals, stats.goals);
        migliori.assists = Math.max(migliori.assists, stats.assists);
        migliori.cleanSheets = Math.max(migliori.cleanSheets, stats.cleanSheets);
      }

      const chiesti = new Map<string, number>();
      for (let seed = 0; seed < 60; seed += 1) {
        const obiettivo = seasonObjectives(
          { expectedPosition: 6, clubCount: 20, role, cupName: 'Coppa Italiana' },
          createRng(seed),
        ).secondary;
        chiesti.set(obiettivo.kind, Math.max(chiesti.get(obiettivo.kind) ?? 0, obiettivo.target));
      }

      for (const [kind, target] of chiesti) {
        if (kind === 'media') expect(migliori.rating, `media per ${role}`).toBeGreaterThanOrEqual(target);
        if (kind === 'gol') expect(migliori.goals, `gol per ${role}`).toBeGreaterThanOrEqual(target);
        if (kind === 'assist') expect(migliori.assists, `assist per ${role}`).toBeGreaterThanOrEqual(target);
        if (kind === 'porta') expect(migliori.cleanSheets, `porta inviolata per ${role}`).toBeGreaterThanOrEqual(target);
      }
    }
  });
});
