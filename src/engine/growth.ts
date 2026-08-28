import type { Rng } from './rng';
import type { CareerPlayer } from './types';

/** Quanto si cresce a una certa età: sotto i 22 tutto, dopo i 30 niente. */
const GROWTH_BY_AGE: readonly (readonly [number, number])[] = [
  [21, 1.0],
  [23, 0.8],
  [25, 0.55],
  [27, 0.3],
  [29, 0.15],
];

function growthFactor(age: number): number {
  for (const [maxAge, factor] of GROWTH_BY_AGE) {
    if (age <= maxAge) return factor;
  }
  return 0;
}

function clampOverall(value: number, potential: number): number {
  return Math.min(99, Math.max(1, Math.min(value, potential)));
}

/**
 * Fa passare una stagione: crescita verso il potenziale, declino dopo il picco.
 * Restituisce un nuovo giocatore, non modifica quello ricevuto.
 */
export function growPlayer(
  player: CareerPlayer,
  minutesShare: number,
  rng: Rng,
): CareerPlayer {
  // Giocare titolare pesa più che allenarsi: chi ha talento e campo lo esprime davvero,
  // altrimenti i fuoriclasse non nascono mai (verificato col Simulation Lab).
  const playFactor = 0.2 + 0.8 * minutesShare;
  const gap = Math.max(0, player.potential - player.overall);
  const gain = Math.round(gap * 0.3 * growthFactor(player.age) * playFactor);

  const yearsPastPeak = Math.max(0, player.age - player.peakAge);
  const decline =
    yearsPastPeak > 0
      ? Math.round(yearsPastPeak * 0.5 * (1 - player.physique / 200)) +
        (minutesShare < 0.3 ? 1 : 0)
      : 0;

  const overall = clampOverall(
    player.overall + gain - decline + rng.int(-1, 1),
    player.potential,
  );

  return {
    ...player,
    age: player.age + 1,
    seasonsPlayed: player.seasonsPlayed + 1,
    overall,
  };
}
