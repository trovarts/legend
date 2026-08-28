import type { CareerSave } from '../engine/play';
import { SAVE_VERSION } from '../engine/save';
import type { Role } from '../world/types';

export interface NewSaveInput {
  name: string;
  nationality: string;
  role: Role;
  age: number;
  leagueLevel: number;
  startClubId: string;
  seed: number;
}

// Si comincia dal vivaio a quattordici anni (D-016).
const MIN_AGE = 14;
const MAX_AGE = 19;

export function newSave(input: NewSaveInput): CareerSave {
  const name = input.name.trim();
  if (name.length === 0) throw new Error('serve un nome per il tuo calciatore');
  if (input.age < MIN_AGE || input.age > MAX_AGE) {
    throw new Error(`età fuori dai limiti: si comincia fra i ${MIN_AGE} e i ${MAX_AGE} anni`);
  }

  return {
    version: SAVE_VERSION,
    seed: input.seed,
    create: {
      name,
      nationality: input.nationality,
      role: input.role,
      age: input.age,
      leagueLevel: input.leagueLevel,
    },
    startClubId: input.startClubId,
    decisions: { training: {}, dilemmas: {}, transfers: {} },
  };
}

/** Il seed di una carriera nuova. Qui la casualità è lecita: siamo fuori dal motore. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}
