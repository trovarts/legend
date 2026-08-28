import { describe, expect, it } from 'vitest';
import { leggiAlbo, registraNellAlbo } from '../../src/ui/alboSalvato';
import type { CareerResult } from '../../src/engine/types';

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

function carriera(goat: number, name = 'Diego', seasons = 18): CareerResult {
  return {
    player: {
      name, nationality: 'Italy', role: 'FWD', age: 35, overall: 70, potential: 80,
      physique: 60, peakAge: 28, seasonsPlayed: seasons, retired: true,
    },
    seasons: [], peakOverall: 82, retiredAt: 35, clubsPlayed: ['Napoli'],
    trophies: [], awards: [], peakValueEur: 0, totalCaps: 0,
    goat: { total: goat, components: {
      performance: 0, trophies: 0, awards: 0, national: 0, peakOverall: 0,
      peakValue: 0, longevity: 0, rival: 0, difficulty: 0,
    } },
    rival: { name: 'Rivale', clubName: 'Altro', peakOverall: 80, trophies: 1, goals: 90 },
    showdowns: [], choices: [], marks: [], injuries: [],
    seasonsAheadOfRival: 0, careerYearsBurned: 0,
  } as CareerResult;
}

describe("l'albo delle carriere", () => {
  it('mette in cima la carriera col punteggio più alto', () => {
    const storage = memoria();
    expect(registraNellAlbo(storage, carriera(400), 1000)).toBe(1);
    expect(registraNellAlbo(storage, carriera(700, 'Marco'), 2000)).toBe(1);
    expect(registraNellAlbo(storage, carriera(500, 'Luca'), 3000)).toBe(2);

    const albo = leggiAlbo(storage);
    expect(albo.map((voce) => voce.goat)).toEqual([700, 500, 400]);
  });

  it('la stessa carriera riaperta non si conta due volte', () => {
    const storage = memoria();
    registraNellAlbo(storage, carriera(400), 1000);
    expect(registraNellAlbo(storage, carriera(400), 5000)).toBeNull();
    expect(leggiAlbo(storage)).toHaveLength(1);
  });

  it('non tiene più di dieci carriere', () => {
    const storage = memoria();
    for (let i = 0; i < 15; i += 1) registraNellAlbo(storage, carriera(100 + i, `G${i}`), 1000 + i);
    expect(leggiAlbo(storage)).toHaveLength(10);
    expect(leggiAlbo(storage)[0]!.goat).toBe(114);
  });

  it('uno storage rotto non fa saltare la home', () => {
    const rotto = { getItem: () => '{non json', setItem: () => {} } as unknown as Storage;
    expect(leggiAlbo(rotto)).toEqual([]);
  });
});
