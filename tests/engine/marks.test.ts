import { describe, expect, it } from 'vitest';
import {
  addMark, ageMarks, injuryRiskModifier, interestModifier, markIntensity, minutesModifier,
} from '../../src/engine/marks.js';
import type { Mark } from '../../src/engine/types.js';

describe('addMark', () => {
  it('aggiunge un segno nuovo', () => {
    const marks = addMark([], 'mercenario', 0.6, 4);
    expect(marks).toHaveLength(1);
    expect(marks[0]).toEqual({ id: 'mercenario', intensity: 0.6, seasonAcquired: 4 });
  });

  it('rinforza un segno che si ha già, senza duplicarlo', () => {
    const once = addMark([], 'mercenario', 0.5, 2);
    const twice = addMark(once, 'mercenario', 0.4, 6);
    expect(twice).toHaveLength(1);
    expect(twice[0]!.intensity).toBeGreaterThan(0.5);
    expect(twice[0]!.intensity).toBeLessThanOrEqual(1);
  });

  it('non muta la lista che riceve', () => {
    const before: Mark[] = [];
    addMark(before, 'bandiera', 0.5, 1);
    expect(before).toHaveLength(0);
  });

  it("l'intensità non supera mai 1", () => {
    let marks = addMark([], 'bandiera', 0.9, 1);
    for (let i = 0; i < 5; i += 1) marks = addMark(marks, 'bandiera', 0.9, i);
    expect(marks[0]!.intensity).toBeLessThanOrEqual(1);
  });
});

describe('ageMarks', () => {
  it('i segni sbiadiscono col tempo', () => {
    const marks = ageMarks(addMark([], 'rissa-col-mister', 0.8, 1));
    expect(marks[0]!.intensity).toBeLessThan(0.8);
  });

  it('un segno quasi spento sparisce', () => {
    let marks = addMark([], 'rissa-col-mister', 0.2, 1);
    for (let i = 0; i < 10; i += 1) marks = ageMarks(marks);
    expect(marks.find((mark) => mark.id === 'rissa-col-mister')).toBeUndefined();
  });

  it('il ginocchio fragile non guarisce mai', () => {
    let marks = addMark([], 'ginocchio-fragile', 0.7, 1);
    for (let i = 0; i < 20; i += 1) marks = ageMarks(marks);
    expect(markIntensity(marks, 'ginocchio-fragile')).toBe(0.7);
  });
});

describe('effetti dei segni', () => {
  it('un segno assente non ha effetto', () => {
    expect(markIntensity([], 'bandiera')).toBe(0);
    expect(minutesModifier([])).toBe(0);
    expect(interestModifier([])).toBe(0);
    expect(injuryRiskModifier([])).toBe(0);
  });

  it('il ginocchio fragile alza il rischio di infortunio', () => {
    expect(injuryRiskModifier(addMark([], 'ginocchio-fragile', 1, 1))).toBeCloseTo(0.6, 2);
  });

  it('litigare col mister toglie minuti, essere leader ne dà', () => {
    expect(minutesModifier(addMark([], 'rissa-col-mister', 1, 1))).toBeLessThan(0);
    expect(minutesModifier(addMark([], 'leader-riconosciuto', 1, 1))).toBeGreaterThan(0);
  });

  it('la reputazione da mercenario allontana i club', () => {
    expect(interestModifier(addMark([], 'mercenario', 1, 1))).toBeLessThan(0);
  });

  it("gli effetti sono proporzionali all'intensità", () => {
    const strong = minutesModifier(addMark([], 'rissa-col-mister', 1, 1));
    const faded = minutesModifier(addMark([], 'rissa-col-mister', 0.3, 1));
    expect(Math.abs(faded)).toBeLessThan(Math.abs(strong));
  });

  it('più segni si sommano', () => {
    const both = addMark(addMark([], 'rissa-col-mister', 1, 1), 'leader-riconosciuto', 1, 1);
    const only = addMark([], 'rissa-col-mister', 1, 1);
    expect(minutesModifier(both)).toBeGreaterThan(minutesModifier(only));
  });
});
