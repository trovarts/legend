import type { Rng } from './rng';
import type { Trophy } from './types';

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

/**
 * Probabilità di vincere la coppa nazionale.
 * La coppa la vince UNA squadra all'anno: la somma su tutto il campionato deve fare circa 1,
 * quindi la probabilità va divisa per il numero di club. Il primo in classifica è favorito
 * (circa il 15% in un torneo a venti squadre), l'ultimo quasi mai.
 */
function cupChance(position: number, clubCount: number): number {
  const normalized = 1 - (position - 1) / Math.max(1, clubCount - 1);
  // Esponente al cubo e base bassa: anche in coppa comandano i club forti, e una
  // squadra di metà classifica la vince una volta ogni quarant'anni, non ogni venti.
  return (0.1 + normalized ** 3 * 2.9) / Math.max(4, clubCount);
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
    // Anche la coppa continentale ha una sola vincitrice fra decine di qualificate.
    if (rng.chance(0.02 + strength ** 3 * 0.1)) {
      trophies.push({
        kind: 'continental',
        season: input.season,
        competitionName: 'Coppa Continentale',
      });
    }
  }

  return trophies;
}
