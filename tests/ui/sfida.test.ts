import { describe, expect, it } from 'vitest';
import { leggiSfida, registraSfida, strisciaViva } from '../../src/ui/sfidaSalvata';

function memoria(): Storage {
  const dati = new Map<string, string>();
  return {
    get length() { return dati.size; },
    clear: () => dati.clear(),
    getItem: (chiave: string) => dati.get(chiave) ?? null,
    key: (indice: number) => [...dati.keys()][indice] ?? null,
    removeItem: (chiave: string) => { dati.delete(chiave); },
    setItem: (chiave: string, valore: string) => { dati.set(chiave, valore); },
  } as Storage;
}

describe('la striscia della sfida', () => {
  it('cresce di uno al giorno', () => {
    const storage = memoria();
    expect(registraSfida(storage, '2026-08-28', true)).toBe(1);
    expect(registraSfida(storage, '2026-08-29', true)).toBe(2);
    expect(registraSfida(storage, '2026-08-30', true)).toBe(3);
  });

  it('centrarla due volte nello stesso giorno non la raddoppia', () => {
    const storage = memoria();
    registraSfida(storage, '2026-08-28', true);
    expect(registraSfida(storage, '2026-08-28', true)).toBe(1);
  });

  it('saltare un giorno la spezza', () => {
    const storage = memoria();
    registraSfida(storage, '2026-08-28', true);
    registraSfida(storage, '2026-08-29', true);
    expect(registraSfida(storage, '2026-09-01', true)).toBe(1);
  });

  it('una carriera che non la centra non tocca niente', () => {
    const storage = memoria();
    registraSfida(storage, '2026-08-28', true);
    expect(registraSfida(storage, '2026-08-29', false)).toBe(1);
    expect(leggiSfida(storage).ultimoGiorno).toBe('2026-08-28');
  });

  it('la striscia mostrata muore da sola dopo due giorni di silenzio', () => {
    const stato = { ultimoGiorno: '2026-08-20', streak: 9 };
    expect(strisciaViva(stato, '2026-08-21')).toBe(9);
    expect(strisciaViva(stato, '2026-08-22')).toBe(0);
  });

  it('primo mese: il giorno prima del primo è la fine del mese precedente', () => {
    const storage = memoria();
    registraSfida(storage, '2026-08-31', true);
    expect(registraSfida(storage, '2026-09-01', true)).toBe(2);
  });
});
