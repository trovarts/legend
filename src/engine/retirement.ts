import type { Rng } from './rng';
import type { CareerPlayer } from './types';

/** Prima di questa età si smette solo se il campo è finito, non per gli anni. */
const EARLIEST_RETIREMENT_AGE = 28;
/** L'età da cui gli anni cominciano a pesare da soli. */
const ETA_IN_CUI_PESA = 31;
const FORCED_RETIREMENT_AGE = 40;

/**
 * Quando si smette.
 *
 * Tre ragioni che si sommano, e nessuna annulla le altre: gli anni, i minuti che non
 * arrivano più, il livello che non basta. Nella versione precedente le tre voci si
 * sottraevano fra loro, così un titolare in salute non raggiungeva mai una
 * probabilità positiva e restava in campo fino al limite d'ufficio: metà delle
 * carriere finiva dopo i trentotto anni, e nessuna prima dei trenta.
 */
export function shouldRetire(
  player: CareerPlayer,
  minutesShare: number,
  rng: Rng,
): boolean {
  if (player.age >= FORCED_RETIREMENT_AGE) return true;
  if (player.age < EARLIEST_RETIREMENT_AGE) return false;

  const anni = Math.max(0, player.age - ETA_IN_CUI_PESA) * 0.11;
  const panchina = Math.max(0, 0.3 - minutesShare) * 1.8;
  // Non essere un fenomeno pesa solo se il campo comincia a mancare: finché uno
  // gioca, gioca — anche in quarta serie, anche a quarantacinque di overall.
  const quantoGioca = Math.max(0, 1 - minutesShare / 0.6);
  const livello = Math.max(0, 62 - player.overall) * 0.015 * quantoGioca;

  return rng.chance(anni + panchina + livello);
}
