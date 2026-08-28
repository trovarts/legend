import { describe, expect, it } from 'vitest';
import { newSave, randomSeed } from '../../src/ui/newSave';

describe('newSave', () => {
  it('crea un salvataggio vuoto e coerente', () => {
    const save = newSave({
      name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17,
      leagueLevel: 1, startClubId: 'c1', seed: 99,
    });
    expect(save.seed).toBe(99);
    expect(save.startClubId).toBe('c1');
    expect(save.create.name).toBe('Diego');
    expect(save.decisions.training).toEqual({});
    expect(save.decisions.dilemmas).toEqual({});
    expect(save.decisions.transfers).toEqual({});
  });

  it('rifiuta un nome vuoto', () => {
    expect(() =>
      newSave({ name: '  ', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1, startClubId: 'c1', seed: 1 }),
    ).toThrow('nome');
  });

  it("rifiuta un'età fuori dai limiti", () => {
    for (const age of [13, 20]) {
      expect(() =>
        newSave({ name: 'Diego', nationality: 'Italy', role: 'FWD', age, leagueLevel: 1, startClubId: 'c1', seed: 1 }),
      ).toThrow('età');
    }
  });

  it('taglia gli spazi attorno al nome', () => {
    const save = newSave({
      name: '  Diego  ', nationality: 'Italy', role: 'FWD', age: 17,
      leagueLevel: 1, startClubId: 'c1', seed: 1,
    });
    expect(save.create.name).toBe('Diego');
  });
});

describe('randomSeed', () => {
  it('produce interi positivi', () => {
    for (let i = 0; i < 50; i += 1) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThan(0);
    }
  });
});
