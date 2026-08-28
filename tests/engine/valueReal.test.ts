import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { marketValue } from '../../src/engine/value';

/**
 * La verifica che conta: la funzione deve riprodurre le mediane osservate nel
 * dataset reale. Se un giorno si cambia il database, questo test dice subito
 * se la curva del valore è ancora sensata.
 */
function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe('valore contro i dati reali', () => {
  it('resta entro il 40% della mediana vera in ogni fascia', () => {
    const csv = readFileSync('data/raw/fc26-players.csv', 'utf8').split('\n');
    const header = csv[0]!.split(',');
    const col = (name: string): number => header.indexOf(name);
    const iOverall = col('overall');
    const iAge = col('age');
    const iPotential = col('potential');
    const iValue = col('value_eur');

    const rows = csv.slice(1).map((line) => line.split(','));
    const buckets: [number, number, number, number][] = [
      [60, 64, 22, 25], [65, 69, 22, 25], [70, 74, 22, 25],
      [75, 79, 22, 25], [80, 84, 22, 25],
      [65, 69, 30, 33], [75, 79, 30, 33],
    ];

    for (const [minOvr, maxOvr, minAge, maxAge] of buckets) {
      const selected = rows.filter((row) => {
        const overall = Number(row[iOverall]);
        const age = Number(row[iAge]);
        return overall >= minOvr && overall <= maxOvr && age >= minAge && age <= maxAge
          && Number(row[iValue]) > 0;
      });
      if (selected.length < 20) continue;

      const realMedian = medianOf(selected.map((row) => Number(row[iValue])));
      const mineMedian = medianOf(
        selected.map((row) =>
          marketValue(Number(row[iOverall]), Number(row[iAge]), Number(row[iPotential])),
        ),
      );
      const ratio = mineMedian / realMedian;
      expect(
        ratio,
        `fascia OVR ${minOvr}-${maxOvr} età ${minAge}-${maxAge}: mia ${(mineMedian / 1e6).toFixed(1)}M contro reale ${(realMedian / 1e6).toFixed(1)}M`,
      ).toBeGreaterThan(0.6);
      expect(ratio).toBeLessThan(1.4);
    }
  });
});
