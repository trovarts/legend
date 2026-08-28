import { describe, expect, it } from 'vitest';
import { marketValue, weeklyWage } from '../../src/engine/value';

describe('marketValue', () => {
  it("cresce con l'overall, sempre", () => {
    let previous = 0;
    for (let overall = 50; overall <= 94; overall += 1) {
      const value = marketValue(overall, 24, overall + 5);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('un ventenne vale più di un trentacinquenne a parità di livello', () => {
    expect(marketValue(80, 20, 88)).toBeGreaterThan(marketValue(80, 35, 80) * 3);
  });

  it('il picco di valore è fra i venti e i venticinque anni', () => {
    const values = [18, 22, 26, 30, 34].map((age) => marketValue(78, age, 84));
    const best = Math.max(...values);
    expect(values.indexOf(best)).toBeLessThanOrEqual(1);
  });

  it('il potenziale alza il valore, ma non lo raddoppia', () => {
    const modest = marketValue(68, 20, 70);
    const huge = marketValue(68, 20, 92);
    expect(huge).toBeGreaterThan(modest);
    expect(huge).toBeLessThan(modest * 1.6);
  });

  it('non restituisce mai valori negativi o assurdi', () => {
    expect(marketValue(40, 38, 40)).toBeGreaterThanOrEqual(0);
    expect(marketValue(99, 24, 99)).toBeLessThan(400_000_000);
  });
});

describe('weeklyWage', () => {
  it('è una frazione piccola del valore', () => {
    expect(weeklyWage(100_000_000)).toBeGreaterThan(200_000);
    expect(weeklyWage(100_000_000)).toBeLessThan(500_000);
  });

  it('cresce col valore', () => {
    expect(weeklyWage(50_000_000)).toBeGreaterThan(weeklyWage(5_000_000));
  });
});
