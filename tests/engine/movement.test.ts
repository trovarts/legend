import { describe, expect, it } from 'vitest';
import { inPlayoffZone, resolveMovement } from '../../src/engine/movement';
import { createRng } from '../../src/engine/rng';

const base = { clubCount: 20, leagueLevel: 3, hasHigher: true, hasLower: true };

describe('salire e scendere di categoria', () => {
  it('i primi due salgono diretti', () => {
    for (const position of [1, 2]) {
      const esito = resolveMovement({ ...base, position }, createRng(3));
      expect(esito.movement).toBe('promosso');
      expect(esito.viaPlayoff).toBe(false);
    }
  });

  it('dal terzo al sesto si passa dai playoff, e ne sale uno su quattro', () => {
    let promossi = 0;
    for (let seed = 0; seed < 400; seed += 1) {
      const esito = resolveMovement({ ...base, position: 4 }, createRng(seed));
      expect(esito.viaPlayoff).toBe(true);
      if (esito.movement === 'promosso') promossi += 1;
    }
    expect(promossi / 400).toBeGreaterThan(0.15);
    expect(promossi / 400).toBeLessThan(0.35);
  });

  it('le ultime tre retrocedono', () => {
    for (const position of [18, 19, 20]) {
      expect(resolveMovement({ ...base, position }, createRng(9)).movement).toBe('retrocesso');
    }
    expect(resolveMovement({ ...base, position: 17 }, createRng(9)).movement).toBeNull();
  });

  it('dalla massima serie non si sale, e dal fondo non si scende', () => {
    const inTesta = resolveMovement(
      { ...base, position: 1, leagueLevel: 1, hasHigher: false },
      createRng(1),
    );
    expect(inTesta.movement).toBeNull();

    const inFondo = resolveMovement(
      { ...base, position: 20, leagueLevel: 4, hasLower: false },
      createRng(1),
    );
    expect(inFondo.movement).toBeNull();
  });

  it('la zona playoff esiste solo sotto la massima serie', () => {
    expect(inPlayoffZone(4, 2)).toBe(true);
    expect(inPlayoffZone(4, 1)).toBe(false);
    expect(inPlayoffZone(7, 2)).toBe(false);
  });
});
