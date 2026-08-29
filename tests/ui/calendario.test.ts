import { describe, expect, it } from 'vitest';
import { annoDi, dataDi, etichettaStagione } from '../../src/ui/calendario';

describe('il calendario della carriera', () => {
  it('comincia dal primo anno di vivaio', () => {
    expect(annoDi(14)).toBe(2024);
    expect(etichettaStagione(14)).toBe('24/25');
    expect(dataDi('ritiro', 14)).toBe('Agosto 2024');
    expect(dataDi('fine', 14)).toBe('Maggio 2025');
  });

  it('gli anni passati nel vivaio contano', () => {
    /*
     * È il motivo per cui l'anno si ricava dall'età e non dal numero di stagione:
     * chi esordisce a diciassette anni ha alle spalle tre anni di giovanili, e il
     * calendario deve dirlo. Legandolo alla stagione, l'esordio sarebbe sempre il 2024.
     */
    expect(annoDi(17)).toBe(2027);
    expect(etichettaStagione(17)).toBe('27/28');
    expect(annoDi(16) - annoDi(14)).toBe(2);
  });

  it('un anno di carriera è un anno di calendario', () => {
    for (let eta = 14; eta < 40; eta += 1) {
      expect(annoDi(eta + 1) - annoDi(eta)).toBe(1);
    }
  });
});
