import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/engine/create.js';
import { createRng } from '../../src/engine/rng.js';

const base = { name: 'Diego', nationality: 'Italy', role: 'FWD' as const, age: 17 };

describe('createPlayer', () => {
  it("conserva i dati scelti dall'utente", () => {
    const player = createPlayer({ ...base, leagueLevel: 1 }, createRng(1));
    expect(player.name).toBe('Diego');
    expect(player.nationality).toBe('Italy');
    expect(player.role).toBe('FWD');
    expect(player.age).toBe(17);
    expect(player.seasonsPlayed).toBe(0);
    expect(player.retired).toBe(false);
  });

  it('parte più forte in prima divisione che in quarta', () => {
    let firstTotal = 0;
    let fourthTotal = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      firstTotal += createPlayer({ ...base, leagueLevel: 1 }, createRng(seed)).overall;
      fourthTotal += createPlayer({ ...base, leagueLevel: 4 }, createRng(seed)).overall;
    }
    expect(firstTotal / 200).toBeGreaterThan(fourthTotal / 200 + 6);
  });

  it("il potenziale è sempre sopra l'overall e non supera 95", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const player = createPlayer({ ...base, leagueLevel: 2 }, createRng(seed));
      expect(player.potential).toBeGreaterThan(player.overall);
      expect(player.potential).toBeLessThanOrEqual(95);
    }
  });

  it('il picco cade fra i 27 e i 29 anni', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const player = createPlayer({ ...base, leagueLevel: 1 }, createRng(seed));
      expect(player.peakAge).toBeGreaterThanOrEqual(27);
      expect(player.peakAge).toBeLessThanOrEqual(29);
    }
  });

  it('i fenomeni sono rari ma esistono, come nel dataset reale', () => {
    let phenoms = 0;
    for (let seed = 0; seed < 3000; seed += 1) {
      if (createPlayer({ ...base, leagueLevel: 1 }, createRng(seed)).potential >= 85) phenoms += 1;
    }
    const share = phenoms / 3000;
    // Nel dataset il 3,9% degli under 19 di prima divisione ha potenziale da 85 in su.
    // Noi stiamo poco sopra, di proposito: il giocatore dell'utente è il protagonista,
    // non un ragazzo preso a caso dalla rosa. Vedi la decisione D-010.
    expect(share).toBeGreaterThan(0.015);
    expect(share).toBeLessThan(0.09);
  });

  it('è deterministico: stesso seed, stesso giocatore', () => {
    const a = createPlayer({ ...base, leagueLevel: 3 }, createRng(77));
    const b = createPlayer({ ...base, leagueLevel: 3 }, createRng(77));
    expect(a).toEqual(b);
  });

  it('un livello sconosciuto ricade sul più basso', () => {
    const deep = createPlayer({ ...base, leagueLevel: 9 }, createRng(4));
    const fourth = createPlayer({ ...base, leagueLevel: 4 }, createRng(4));
    expect(deep.overall).toBe(fourth.overall);
  });
});
