import type { Club } from '../world/types';
import { clubStrength } from './clubStrength';
import type { Rng } from './rng';

export interface StandingRow {
  clubId: string;
  clubName: string;
  strength: number;
  played: number;
  points: number;
  goalDifference: number;
  isPlayer: boolean;
}

const MATCHES = 38;

/**
 * La classifica completa del campionato, coerente con la posizione che il motore ha
 * già assegnato al giocatore: non la ricalcola, la racconta. Serve a mostrare la
 * stagione come la vedrebbe un tifoso, non come una riga di dati.
 */
export function leagueTable(
  clubs: readonly Club[],
  playerClubId: string,
  playerPosition: number,
  rng: Rng,
): StandingRow[] {
  const others = clubs
    .filter((club) => club.id !== playerClubId)
    .map((club) => ({ club, noisy: clubStrength(club) + (rng.next() - 0.5) * 7 }))
    .sort((a, b) => b.noisy - a.noisy);

  const player = clubs.find((club) => club.id === playerClubId);
  const ordered: Club[] = others.map((entry) => entry.club);
  if (player) {
    const index = Math.min(ordered.length, Math.max(0, playerPosition - 1));
    ordered.splice(index, 0, player);
  }

  const total = ordered.length;
  return ordered.map((club, index) => {
    // Punti plausibili: chi sta in alto ne fa molti, l'ultimo arranca.
    const quota = total > 1 ? 1 - index / (total - 1) : 1;
    const points = Math.round(24 + quota * 60 + (rng.next() - 0.5) * 6);
    const goalDifference = Math.round((quota - 0.5) * 70 + (rng.next() - 0.5) * 12);
    return {
      clubId: club.id,
      clubName: club.name,
      strength: clubStrength(club),
      played: MATCHES,
      points: Math.max(8, points),
      goalDifference,
      isPlayer: club.id === playerClubId,
    };
  });
}
