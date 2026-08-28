import type { Club } from '../world/types';
import { clubStrength } from './clubStrength';
import type { Rng } from './rng';

export type CupRound = 'quarti' | 'semifinale' | 'finale';

export interface CupTie {
  round: CupRound;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  /** Vero se il club del giocatore è in campo. */
  playerInvolved: boolean;
}

export interface CupBracket {
  name: string;
  ties: CupTie[];
  /** Il turno in cui il club del giocatore è uscito, oppure la vittoria. */
  reached: CupRound | 'vittoria';
  winner: string;
}

const ROUNDS: readonly CupRound[] = ['quarti', 'semifinale', 'finale'];

/**
 * Un tabellone a otto squadre costruito attorno a un risultato già deciso dal motore:
 * non stabilisce niente, mette in scena. Serve a far vedere la coppa invece di
 * scriverne una riga.
 */
export function buildCupBracket(
  competitionName: string,
  clubs: readonly Club[],
  playerClubId: string,
  won: boolean,
  rng: Rng,
): CupBracket {
  const player = clubs.find((club) => club.id === playerClubId);
  const rivals = [...clubs]
    .filter((club) => club.id !== playerClubId)
    .sort((a, b) => clubStrength(b) - clubStrength(a))
    .slice(0, 7);

  if (!player || rivals.length < 7) {
    return { name: competitionName, ties: [], reached: 'quarti', winner: player?.name ?? '' };
  }

  // Fin dove arriva: se ha vinto va fino in fondo, altrimenti esce a un turno estratto.
  const exitAt = won ? ROUNDS.length : rng.int(0, ROUNDS.length - 1);

  const ties: CupTie[] = [];
  let squadre = [player.name, ...rivals.map((club) => club.name)];

  for (let round = 0; round < ROUNDS.length; round += 1) {
    const nome = ROUNDS[round]!;
    const prossime: string[] = [];

    for (let i = 0; i < squadre.length; i += 2) {
      const casa = squadre[i]!;
      const ospite = squadre[i + 1] ?? squadre[0]!;
      const giocatore = casa === player.name || ospite === player.name;

      // Chi passa: il giocatore secondo il copione, gli altri per sorteggio.
      const passaCasa = giocatore
        ? (casa === player.name) === round < exitAt
        : rng.chance(0.5);

      const gol = rng.int(1, 3);
      const subiti = rng.int(0, gol - 1);
      ties.push({
        round: nome,
        home: casa,
        away: ospite,
        homeGoals: passaCasa ? gol : subiti,
        awayGoals: passaCasa ? subiti : gol,
        playerInvolved: giocatore,
      });
      prossime.push(passaCasa ? casa : ospite);
    }

    squadre = prossime;
    if (squadre.length <= 1) break;
  }

  return {
    name: competitionName,
    ties,
    reached: won ? 'vittoria' : (ROUNDS[Math.min(exitAt, ROUNDS.length - 1)] ?? 'quarti'),
    winner: squadre[0] ?? player.name,
  };
}
