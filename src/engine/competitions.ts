import type { CountryCompetitions } from './competitionsMap';
import { continentalTierFor } from './competitionsMap';
import type { Rng } from './rng';
import type { Trophy } from './types';

export interface TrophiesInput {
  season: number;
  leagueName: string;
  /** Posizione finale in campionato, 1-based. */
  position: number;
  clubCount: number;
  /** In quale coppa continentale si è qualificata la squadra l'anno prima. */
  continentalTier: 'prima' | 'seconda' | 'terza' | null;
  minutesShare: number;
  /** Le competizioni del paese: nomi veri, non etichette generiche. */
  competitions: CountryCompetitions;
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
    trophies.push({
      kind: 'nationalCup',
      season: input.season,
      competitionName: input.competitions.cup,
    });
  }

  if (input.continentalTier !== null) {
    const strength = 1 - (input.position - 1) / Math.max(1, input.clubCount - 1);
    // Più in basso è la coppa, più è facile vincerla: la Terza non è la Coppa Europea.
    const facilita = input.continentalTier === 'prima' ? 1 : input.continentalTier === 'seconda' ? 1.6 : 2.4;
    if (rng.chance((0.02 + strength ** 3 * 0.1) * facilita)) {
      trophies.push({
        kind: 'continental',
        season: input.season,
        competitionName: input.competitions.continental[input.continentalTier],
      });
    }
  }

  return trophies;
}
