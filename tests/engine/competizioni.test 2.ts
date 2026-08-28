import { describe, expect, it } from 'vitest';
import { competitionsOf, continentalTierFor } from '../../src/engine/competitionsMap';

describe('le competizioni di un paese', () => {
  it("l'Italia gioca le coppe europee e gli Europei", () => {
    const italia = competitionsOf('Italy');
    expect(italia.cup).toBe('Coppa Italiana');
    expect(italia.continental.prima).toBe('Coppa Europea');
    expect(italia.national.major).toBe('Europei');
  });

  it('il Brasile gioca le sue, non quelle europee', () => {
    const brasile = competitionsOf('Brazil');
    expect(brasile.continental.prima).toBe('Coppa Sudamericana');
    expect(brasile.national.major).toBe('Coppa America');
  });

  it("l'Arabia Saudita gioca in Asia", () => {
    expect(competitionsOf('Saudi Arabia').continental.prima).toBe('Coppa Asiatica per Club');
    expect(competitionsOf('Saudi Arabia').cup).toBe('Coppa Saudita');
  });

  it('i movimenti più forti hanno più posti nelle coppe', () => {
    expect(competitionsOf('Spain').spots.prima).toBeGreaterThan(competitionsOf('Romania').spots.prima);
  });

  it('un paese sconosciuto ha comunque le sue competizioni', () => {
    const ignoto = competitionsOf('Andorra');
    expect(ignoto.cup.length).toBeGreaterThan(3);
    expect(ignoto.spots.prima).toBeGreaterThanOrEqual(1);
  });
});

describe('in quale coppa si finisce', () => {
  const italia = competitionsOf('Italy');

  it('chi arriva in alto va nella prima', () => {
    expect(continentalTierFor(1, italia)).toBe('prima');
    expect(continentalTierFor(italia.spots.prima, italia)).toBe('prima');
  });

  it('subito sotto si scende di coppa', () => {
    expect(continentalTierFor(italia.spots.prima + 1, italia)).toBe('seconda');
  });

  it('chi resta indietro non gioca niente', () => {
    expect(continentalTierFor(15, italia)).toBeNull();
  });
});
