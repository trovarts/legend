import { describe, expect, it } from 'vitest';
import { PLAY_STYLES, playStyleEffect } from '../../src/engine/playstyle';

describe('gli stili di gioco', () => {
  it('sono quattro e hanno tutti una descrizione', () => {
    expect(PLAY_STYLES).toHaveLength(4);
    for (const style of PLAY_STYLES) {
      expect(style.label.length).toBeGreaterThan(4);
      expect(style.text.length).toBeGreaterThan(20);
    }
  });

  it('il goleador segna di più e serve di meno', () => {
    const effect = playStyleEffect('goleador');
    expect(effect.goals).toBeGreaterThan(1);
    expect(effect.assists).toBeLessThan(1);
  });

  it('il rifinitore fa il contrario', () => {
    const effect = playStyleEffect('rifinitore');
    expect(effect.assists).toBeGreaterThan(1);
    expect(effect.goals).toBeLessThan(1);
  });

  it("chi gioca per vincere è giudicato sul risultato della squadra", () => {
    expect(playStyleEffect('vincente').teamWeight).toBeGreaterThan(0);
    expect(playStyleEffect('equilibrato').teamWeight).toBe(0);
  });

  it('nessuno stile è gratis: chi guadagna da una parte perde dall\'altra', () => {
    for (const style of PLAY_STYLES) {
      const effect = playStyleEffect(style.id);
      const totale = effect.goals + effect.assists + effect.teamWeight;
      expect(totale).toBeGreaterThan(1.8);
      expect(totale).toBeLessThan(2.3);
    }
  });
});
