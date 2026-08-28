import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave, isSupportedSave, SAVE_VERSION } from '../../src/engine/save.js';
import type { CareerSave } from '../../src/engine/play.js';

const save: CareerSave = {
  version: SAVE_VERSION,
  seed: 2026,
  create: { name: 'Diego Trovato', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
  startClubId: 'c123',
  decisions: {
    training: { '1': 'tecnica', '2': 'fisico' },
    dilemmas: { '2:panchina-lunga': 'parla' },
    transfers: { '3': 'c456' },
  },
};

describe('encodeSave e decodeSave', () => {
  it('un salvataggio sopravvive al giro completo', () => {
    expect(decodeSave(encodeSave(save))).toEqual(save);
  });

  it('il codice è breve abbastanza da incollarlo in chat', () => {
    expect(encodeSave(save).length).toBeLessThan(600);
  });

  it('il codice non contiene caratteri che si rompono in un URL', () => {
    expect(encodeSave(save)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('un codice inventato viene rifiutato con un messaggio chiaro', () => {
    expect(() => decodeSave('non-e-un-codice!!')).toThrow('codice non valido');
  });

  it('un salvataggio di una versione diversa viene rifiutato', () => {
    expect(() => decodeSave(encodeSave({ ...save, version: SAVE_VERSION + 1 }))).toThrow('versione');
  });

  it('nomi con accenti e apostrofi sopravvivono', () => {
    const accented: CareerSave = { ...save, create: { ...save.create, name: "Niccolò D'Amico" } };
    expect(decodeSave(encodeSave(accented)).create.name).toBe("Niccolò D'Amico");
  });
});

describe('isSupportedSave', () => {
  it('riconosce un salvataggio buono', () => {
    expect(isSupportedSave(save)).toBe(true);
  });

  it('rifiuta oggetti che non lo sono', () => {
    expect(isSupportedSave(null)).toBe(false);
    expect(isSupportedSave({})).toBe(false);
    expect(isSupportedSave({ ...save, decisions: undefined })).toBe(false);
    expect(isSupportedSave({ ...save, version: 99 })).toBe(false);
  });
});
