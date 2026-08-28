import type { Rng } from './rng';

export interface Contract {
  yearsLeft: number;
  signedInSeason: number;
}

/**
 * Durata del contratto: lunga per i giovani su cui si punta, corta per chi è a fine corsa.
 * Serve a dare attrito al mercato (decisione D-008): senza, si cambia squadra ogni estate.
 */
export function signContract(season: number, age: number, rng: Rng): Contract {
  const base = age <= 23 ? 4 : age <= 29 ? 3 : age <= 33 ? 2 : 1;
  const yearsLeft = Math.min(5, Math.max(1, base + rng.int(-1, 1)));
  return { yearsLeft, signedInSeason: season };
}

export function tickContract(contract: Contract): Contract {
  return { ...contract, yearsLeft: Math.max(0, contract.yearsLeft - 1) };
}

/** Si cambia squadra solo quando il contratto sta per finire. */
export function canLeave(contract: Contract): boolean {
  return contract.yearsLeft <= 1;
}
