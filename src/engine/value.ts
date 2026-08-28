/**
 * Valore di mercato e stipendio, tarati sulle mediane osservate nel dataset reale
 * (18.405 giocatori). Le ancore sono valori misurati, non stimati: vedi il piano
 * di Fase 2 e `tests/engine/valueReal.test.ts`.
 */

/** Valore mediano in euro per overall, alla fascia d'età 22-25. */
const VALUE_ANCHORS: readonly (readonly [number, number])[] = [
  // Sotto i 55 il dataset non dà mediane affidabili: ancora stimata, serve solo
  // perché la curva resti crescente anche in fondo alla scala.
  [45, 80_000],
  [55, 300_000],
  [62, 700_000],
  [67, 1_600_000],
  [72, 3_500_000],
  [77, 14_000_000],
  [82, 37_200_000],
  [87, 100_800_000],
  [94, 190_000_000],
];

/** Moltiplicatore per età, rispetto alla fascia 22-25 presa come riferimento. */
const AGE_ANCHORS: readonly (readonly [number, number])[] = [
  [19, 1.25],
  [23.5, 1.0],
  [27.5, 0.68],
  [31.5, 0.46],
  [36, 0.19],
  [41, 0.05],
];

/** Interpolazione fra due ancore; geometrica per il valore, lineare per l'età. */
function interpolate(
  anchors: readonly (readonly [number, number])[],
  x: number,
  geometric: boolean,
): number {
  const first = anchors[0]!;
  const last = anchors[anchors.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];

  for (let i = 1; i < anchors.length; i += 1) {
    const [x1, y1] = anchors[i - 1]!;
    const [x2, y2] = anchors[i]!;
    if (x <= x2) {
      const t = (x - x1) / (x2 - x1);
      return geometric ? y1 * (y2 / y1) ** t : y1 + (y2 - y1) * t;
    }
  }
  return last[1];
}

export function marketValue(overall: number, age: number, potential: number): number {
  const base = interpolate(VALUE_ANCHORS, overall, true);
  const ageFactor = interpolate(AGE_ANCHORS, age, false);
  // Il potenziale conta, ma meno di quanto si creda: +30% al massimo.
  const upside = Math.max(0, potential - overall);
  const potentialFactor = 1 + Math.min(0.3, upside * 0.025);
  // Arrotondamento fine: a 10.000 due overall consecutivi collassavano sullo stesso valore.
  return Math.round((base * ageFactor * potentialFactor) / 1_000) * 1_000;
}

/** Nel dataset reale lo stipendio settimanale è il 3,36 per mille del valore. */
export function weeklyWage(valueEur: number): number {
  return Math.round((valueEur * 0.00336) / 100) * 100;
}
