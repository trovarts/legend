import { describe, expect, it } from 'vitest';
import type { DilemmaContext } from '../../src/engine/dilemmaCatalog';
import {
  applyEffects, boldPolicy, pickDilemmas, resolveOption, type DilemmaState,
} from '../../src/engine/dilemmas';
import { addMark, markIntensity } from '../../src/engine/marks';
import { createRng } from '../../src/engine/rng';
import type { DilemmaOption } from '../../src/engine/types';

const base: DilemmaContext = {
  season: 5, age: 24, overall: 72, minutesShare: 0.7, injury: null, marks: [],
  clubName: 'Napoli', leagueLevel: 1, contractYearsLeft: 2, wonSomething: false,
  recentDilemmaIds: [],
};

const emptyState: DilemmaState = {
  overall: 72, marks: [], minutesDelta: 0, retirementDelta: 0, valueMultiplier: 1,
};

describe('pickDilemmas', () => {
  it('non propone mai più di tre bivi in una stagione', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      expect(pickDilemmas(base, createRng(seed)).length).toBeLessThanOrEqual(3);
    }
  });

  it('non propone due volte lo stesso bivio nella stessa stagione', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const picked = pickDilemmas(base, createRng(seed));
      expect(new Set(picked.map((d) => d.id)).size).toBe(picked.length);
    }
  });

  it('propone solo bivi compatibili con la situazione', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const picked = pickDilemmas({ ...base, minutesShare: 0.8 }, createRng(seed));
      expect(picked.some((d) => d.id === 'panchina-lunga')).toBe(false);
      expect(picked.some((d) => d.id === 'rientro-anticipato')).toBe(false);
    }
  });

  it("chi è infortunato incontra il bivio dell'infortunio", () => {
    const hurt = { ...base, injury: { severity: 'grave' as const, matchesOut: 28, season: 5 } };
    let seen = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (pickDilemmas(hurt, createRng(seed)).some((d) => d.id === 'rientro-anticipato')) seen += 1;
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('un Segno vecchio apre un bivio che prima non esisteva', () => {
    const withMark = { ...base, marks: addMark([], 'rissa-col-mister', 0.8, 2) };
    let seen = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (pickDilemmas(withMark, createRng(seed)).some((d) => d.id === 'pace-col-mister')) seen += 1;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('è deterministico', () => {
    expect(pickDilemmas(base, createRng(4))).toEqual(pickDilemmas(base, createRng(4)));
  });
});

describe('resolveOption', () => {
  const option: DilemmaOption = {
    id: 'test', label: 'Prova', stake: 'Una posta qualunque',
    outcomes: [
      { chance: 0.7, text: 'Va bene', effects: { overall: 1 } },
      { chance: 0.3, text: 'Va male', effects: { overall: -1 } },
    ],
  };

  it('restituisce sempre uno degli esiti previsti', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      expect(option.outcomes).toContain(resolveOption(option, createRng(seed)));
    }
  });

  it('rispetta le probabilità dichiarate', () => {
    let good = 0;
    for (let seed = 0; seed < 2000; seed += 1) {
      if (resolveOption(option, createRng(seed)).text === 'Va bene') good += 1;
    }
    expect(good / 2000).toBeGreaterThan(0.63);
    expect(good / 2000).toBeLessThan(0.77);
  });

  it('è deterministico', () => {
    expect(resolveOption(option, createRng(9))).toBe(resolveOption(option, createRng(9)));
  });
});

describe('applyEffects', () => {
  it('somma i punti di overall', () => {
    expect(applyEffects(emptyState, { overall: -3 }, 5).overall).toBe(69);
  });

  it('aggiunge un Segno', () => {
    const state = applyEffects(emptyState, { addMark: { id: 'bandiera', intensity: 0.5 } }, 5);
    expect(markIntensity(state.marks, 'bandiera')).toBe(0.5);
  });

  it('toglie un Segno', () => {
    const withMark: DilemmaState = { ...emptyState, marks: addMark([], 'rissa-col-mister', 0.8, 1) };
    const state = applyEffects(withMark, { removeMark: 'rissa-col-mister' }, 5);
    expect(markIntensity(state.marks, 'rissa-col-mister')).toBe(0);
  });

  it('accumula i minuti e gli anni di carriera', () => {
    const once = applyEffects(emptyState, { minutesDelta: 0.1, retirementDelta: -2 }, 5);
    const twice = applyEffects(once, { minutesDelta: 0.05, retirementDelta: -1 }, 6);
    expect(twice.minutesDelta).toBeCloseTo(0.15, 5);
    expect(twice.retirementDelta).toBe(-3);
  });

  it('moltiplica il valore', () => {
    expect(applyEffects(emptyState, { valueMultiplier: 1.2 }, 5).valueMultiplier).toBeCloseTo(1.2, 5);
  });

  it('un effetto vuoto non cambia niente', () => {
    expect(applyEffects(emptyState, {}, 5)).toEqual(emptyState);
  });

  it('non muta lo stato che riceve', () => {
    applyEffects(emptyState, { overall: 5, addMark: { id: 'bandiera', intensity: 1 } }, 5);
    expect(emptyState.overall).toBe(72);
    expect(emptyState.marks).toHaveLength(0);
  });
});

describe('boldPolicy', () => {
  it('sceglie sempre una delle opzioni offerte', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const picked = pickDilemmas({ ...base, minutesShare: 0.1 }, createRng(seed));
      for (const dilemma of picked) {
        expect(dilemma.options).toContain(boldPolicy(dilemma, base));
      }
    }
  });

  it("chi non gioca preferisce l'opzione che promette più campo", () => {
    const dilemma = pickDilemmas({ ...base, minutesShare: 0.05 }, createRng(1))
      .find((d) => d.id === 'panchina-lunga');
    if (dilemma) {
      const chosen = boldPolicy(dilemma, { ...base, minutesShare: 0.05 });
      expect(['parla', 'chiedi-cessione']).toContain(chosen.id);
    }
  });

  it('è deterministica', () => {
    const dilemmas = pickDilemmas(base, createRng(2));
    for (const dilemma of dilemmas) {
      expect(boldPolicy(dilemma, base).id).toBe(boldPolicy(dilemma, base).id);
    }
  });
});
