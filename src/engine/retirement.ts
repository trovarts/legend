import type { Rng } from './rng.js';
import type { CareerPlayer } from './types.js';

const EARLIEST_RETIREMENT_AGE = 32;
const FORCED_RETIREMENT_AGE = 40;

/**
 * Si smette per età, per non giocare più, o perché non si è abbastanza forti.
 * La Fase 2 aggiungerà il peso degli infortuni e delle offerte ricevute (spec §3.3).
 */
export function shouldRetire(
  player: CareerPlayer,
  minutesShare: number,
  rng: Rng,
): boolean {
  if (player.age >= FORCED_RETIREMENT_AGE) return true;
  if (player.age < EARLIEST_RETIREMENT_AGE) return false;

  const probability =
    (player.age - 31) * 0.08 +
    (0.25 - minutesShare) * 1.2 +
    (60 - player.overall) * 0.01;

  return rng.chance(probability);
}
