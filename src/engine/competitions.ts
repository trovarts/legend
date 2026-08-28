import type { Rng } from './rng.js';
import type { Trophy } from './types.js';

export interface TrophiesInput {
  season: number;
  leagueName: string;
  /** Posizione finale in campionato, 1-based. */
  position: number;
  clubCount: number;
  /** Qualificata alla coppa continentale grazie alla stagione precedente. */
  qualifiedToContinental: boolean;
  minutesShare: number;
}

/** Quanto pesa la posizione sulla coppa nazionale: il primo è favorito, l'ultimo quasi mai. */
function cupChance(position: number, clubCount: number): number {
  const normalized = 1 - (position - 1) / Math.max(1, clubCount - 1);
  return 0.03 + normalized ** 2 * 0.27;
}

export function resolveTrophies(input: TrophiesInput, rng: Rng): Trophy[] {
  const trophies: Trophy[] = [];

  if (input.position === 1) {
    trophies.push({ kind: 'league', season: input.season, competitionName: input.leagueName });
  }

  if (rng.chance(cupChance(input.position, input.clubCount))) {
    trophies.push({ kind: 'nationalCup', season: input.season, competitionName: 'Coppa Nazionale' });
  }

  if (input.qualifiedToContinental) {
    const strength = 1 - (input.position - 1) / Math.max(1, input.clubCount - 1);
    if (rng.chance(0.03 + strength ** 3 * 0.15)) {
      trophies.push({
        kind: 'continental',
        season: input.season,
        competitionName: 'Coppa Continentale',
      });
    }
  }

  return trophies;
}
