import { describe, expect, it } from 'vitest';
import { DILEMMA_CATALOG, type DilemmaContext } from '../../src/engine/dilemmaCatalog';
import { addMark } from '../../src/engine/marks';

const base: DilemmaContext = {
  season: 5, age: 24, overall: 72, minutesShare: 0.7, injury: null, marks: [],
  clubName: 'Napoli', leagueLevel: 1, contractYearsLeft: 2, wonSomething: false,
  recentDilemmaIds: [],
};

describe('catalogo dei bivi', () => {
  it('contiene almeno otto bivi', () => {
    expect(DILEMMA_CATALOG.length).toBeGreaterThanOrEqual(8);
  });

  it('ogni bivio ha un id unico', () => {
    const ids = DILEMMA_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('le probabilità di ogni opzione sommano a uno', () => {
    for (const entry of DILEMMA_CATALOG) {
      const dilemma = entry.build({
        ...base, injury: { severity: 'seria', matchesOut: 12, season: 5 },
      });
      for (const option of dilemma.options) {
        const total = option.outcomes.reduce((sum, outcome) => sum + outcome.chance, 0);
        expect(total, `${dilemma.id} / ${option.id}`).toBeCloseTo(1, 5);
      }
    }
  });

  it('ogni bivio offre almeno due strade', () => {
    for (const entry of DILEMMA_CATALOG) {
      const dilemma = entry.build({
        ...base, injury: { severity: 'grave', matchesOut: 26, season: 5 },
      });
      expect(dilemma.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('ogni opzione dichiara la posta in gioco', () => {
    for (const entry of DILEMMA_CATALOG) {
      const dilemma = entry.build({
        ...base, injury: { severity: 'seria', matchesOut: 12, season: 5 },
      });
      for (const option of dilemma.options) {
        expect(option.stake.length, `${dilemma.id} / ${option.id}`).toBeGreaterThan(10);
        expect(option.label.length).toBeGreaterThan(2);
      }
    }
  });

  it('i testi sono in italiano e parlano del club vero', () => {
    const entry = DILEMMA_CATALOG.find((item) => item.id === 'rinnovo-o-addio')!;
    const dilemma = entry.build({ ...base, contractYearsLeft: 0 });
    expect(dilemma.text).toContain('Napoli');
  });

  it("il bivio dell'infortunio si presenta solo se sei infortunato", () => {
    const entry = DILEMMA_CATALOG.find((item) => item.id === 'rientro-anticipato')!;
    expect(entry.when(base)).toBe(false);
    expect(entry.when({ ...base, injury: { severity: 'seria', matchesOut: 12, season: 5 } })).toBe(true);
  });

  it('il bivio della panchina si presenta solo a chi non gioca', () => {
    const entry = DILEMMA_CATALOG.find((item) => item.id === 'panchina-lunga')!;
    expect(entry.when({ ...base, minutesShare: 0.8 })).toBe(false);
    expect(entry.when({ ...base, minutesShare: 0.1 })).toBe(true);
  });

  it('esiste almeno un bivio che si apre per via di un Segno passato', () => {
    const contextWithMark = { ...base, marks: addMark([], 'rissa-col-mister', 0.8, 2) };
    const opened = DILEMMA_CATALOG.filter(
      (entry) => !entry.when(base) && entry.when(contextWithMark),
    );
    expect(opened.length).toBeGreaterThan(0);
  });

  it('almeno un bivio può lasciare un Segno permanente', () => {
    const entry = DILEMMA_CATALOG.find((item) => item.id === 'rientro-anticipato')!;
    const dilemma = entry.build({
      ...base, injury: { severity: 'grave', matchesOut: 28, season: 5 },
    });
    const leavesMark = dilemma.options.some((option) =>
      option.outcomes.some((outcome) => outcome.effects.addMark?.id === 'ginocchio-fragile'),
    );
    expect(leavesMark).toBe(true);
  });
});
