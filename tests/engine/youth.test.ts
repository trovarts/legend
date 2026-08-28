import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng';
import { playYouthSeason, YOUTH_OPTIONS, youthOption } from '../../src/engine/youth';

const base = {
  year: 1, age: 14, clubName: 'Quevilly', overall: 40, potential: 80,
  approach: 'piano-completo' as const,
};

describe('le scelte del vivaio', () => {
  it('sono tre, e una sola è senza rischio', () => {
    expect(YOUTH_OPTIONS).toHaveLength(3);
    const certe = YOUTH_OPTIONS.filter((option) => option.outcomes.length === 1);
    expect(certe).toHaveLength(1);
  });

  it('ogni scommessa ha probabilità che sommano a uno', () => {
    for (const option of YOUTH_OPTIONS) {
      const totale = option.outcomes.reduce((sum, outcome) => sum + outcome.chance, 0);
      expect(totale).toBeCloseTo(1, 5);
    }
  });

  it('chi rischia di più può guadagnare di più', () => {
    const aggressivo = Math.max(...youthOption('forza-il-ritmo').outcomes.map((o) => o.overall));
    const sicuro = Math.max(...youthOption('proteggi-la-crescita').outcomes.map((o) => o.overall));
    expect(aggressivo).toBeGreaterThan(sicuro);
  });
});

describe('playYouthSeason', () => {
  it('produce una stagione da settore giovanile', () => {
    const season = playYouthSeason(base, createRng(1));
    expect(season.appearances).toBeGreaterThan(8);
    expect(season.appearances).toBeLessThanOrEqual(22);
    expect(season.rating).toBeGreaterThan(5);
    expect(season.rating).toBeLessThan(9);
  });

  it("l'approccio conservativo dà sempre lo stesso passo avanti", () => {
    const certo = youthOption('proteggi-la-crescita').outcomes[0]!.overall;
    for (let seed = 0; seed < 50; seed += 1) {
      const season = playYouthSeason({ ...base, approach: 'proteggi-la-crescita' }, createRng(seed));
      expect(season.overallEnd - season.overallStart).toBe(certo);
    }
  });

  it("l'approccio aggressivo a volte dà poco, a volte molto", () => {
    const guadagni = new Set<number>();
    for (let seed = 0; seed < 60; seed += 1) {
      const season = playYouthSeason({ ...base, approach: 'forza-il-ritmo' }, createRng(seed));
      guadagni.add(season.overallEnd - season.overallStart);
    }
    const attesi = youthOption('forza-il-ritmo').outcomes.map((o) => o.overall);
    for (const atteso of attesi) expect(guadagni.has(atteso)).toBe(true);
  });

  it('tre anni di vivaio portano dove comincia una carriera vera', () => {
    // Il salto in prima squadra parte da qui: se si esce troppo deboli non si
    // recupera più, se troppo forti il vivaio diventa una scorciatoia.
    for (const approach of ['forza-il-ritmo', 'piano-completo', 'proteggi-la-crescita'] as const) {
      let overall = 40;
      for (let anno = 1; anno <= 3; anno += 1) {
        overall = playYouthSeason(
          { ...base, year: anno, age: 13 + anno, overall, approach },
          createRng(anno * 31 + 5),
        ).overallEnd;
      }
      expect(overall).toBeGreaterThanOrEqual(43);
      expect(overall).toBeLessThanOrEqual(58);
    }
  });

  it('non si supera mai il proprio potenziale', () => {
    const season = playYouthSeason({ ...base, overall: 79, potential: 80, approach: 'forza-il-ritmo' }, createRng(2));
    expect(season.overallEnd).toBeLessThanOrEqual(80);
  });

  it('è deterministica', () => {
    expect(playYouthSeason(base, createRng(7))).toEqual(playYouthSeason(base, createRng(7)));
  });
});
