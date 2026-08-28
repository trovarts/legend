import type { Role } from '../world/types.js';
import type { Rng } from './rng.js';
import type { CareerPlayer } from './types.js';

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
const MAX_POTENTIAL = 94;

export function createPlayer(input: CreatePlayerInput, rng: Rng): CareerPlayer {
  const base = BASE_OVERALL_BY_LEVEL[input.leagueLevel] ?? BASE_OVERALL_BY_LEVEL[4]!;
  const overall = base + rng.int(-2, 3);
  const potential = Math.min(MAX_POTENTIAL, overall + rng.int(8, 30));
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
