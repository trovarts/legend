import type { Role } from '../world/types';
import type { Rng } from './rng';
import type { CareerPlayer } from './types';

export interface CreatePlayerInput {
  name: string;
  nationality: string;
  role: Role;
  /** 16-19 alla creazione. */
  age: number;
  /** Livello del campionato in cui si comincia: 1 = massima serie. */
  leagueLevel: number;
}

/** Partire in basso significa partire più deboli — ma con più spazio per giocare (spec §3.1). */
const BASE_OVERALL_BY_LEVEL: Record<number, number> = { 1: 55, 2: 52, 3: 49, 4: 46 };
const MAX_POTENTIAL = 95;

/**
 * Quanto sei promettente alla nascita.
 *
 * Misurato sui 1999 under 19 del dataset reale: il margine di potenziale arriva al
 * massimo a +26 (mediana +15), mentre il potenziale assoluto tocca 95. Vuol dire che
 * i fuoriclasse non hanno un margine enorme: **partono già forti**. Il 3% degli under 19
 * ha potenziale da 85 in su (il 3,9% se si guarda solo la prima divisione), lo 0,6% da 88 in su.
 */
function talentBonus(rng: Rng): number {
  const roll = rng.next();
  if (roll > 0.985) return rng.int(12, 20); // il fenomeno di una generazione
  if (roll > 0.9) return rng.int(6, 12); // una promessa vera
  return rng.int(0, 5); // un buon giovane come tanti
}

export function createPlayer(input: CreatePlayerInput, rng: Rng): CareerPlayer {
  const base = BASE_OVERALL_BY_LEVEL[input.leagueLevel] ?? BASE_OVERALL_BY_LEVEL[4]!;
  const overall = base + talentBonus(rng) + rng.int(-2, 2);
  const potential = Math.min(MAX_POTENTIAL, overall + rng.int(10, 26));
  const physique = rng.int(40, 85);

  return {
    name: input.name,
    nationality: input.nationality,
    role: input.role,
    age: input.age,
    overall,
    potential,
    physique,
    peakAge: 26 + Math.floor(physique / 25),
    seasonsPlayed: 0,
    retired: false,
  };
}
