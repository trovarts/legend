import type { Club } from '../world/types';
import { clubStrength } from './clubStrength';
import type { Rng } from './rng';

export interface PlayoffTie {
  round: 'semifinale' | 'finale';
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  playerInvolved: boolean;
}

export interface PlayoffBracket {
  leagueName: string;
  ties: PlayoffTie[];
  promoted: boolean;
  winner: string;
}

/** Chi arriva in questa forbice si jgioca la promozione ai playoff. */
export const PLAYOFF_FROM = 3;
export const PLAYOFF_TO = 6;

export function inPlayoffZone(position: number, leagueLevel: number): boolean {
  return leagueLevel > 1 && position >= PLAYOFF_FROM && position <= PLAYOFF_TO;
}

/**
 * I playoff di promozione: quattro squadre, due semifinali e una finale.
 * Chi vince sale di categoria — ed è il momento più teso di una stagione in serie minore.
 */
export function buildPlayoff(
  leagueName: string,
  clubs: readonly Club[],
  playerClubId: string,
  rng: Rng,
): PlayoffBracket {
  const player = clubs.find((club) => club.id === playerClubId);
  const rivali = [...clubs]
    .filter((club) => club.id !== playerClubId)
    .sort((a, b) => clubStrength(b) - clubStrength(a))
    .slice(0, 3);

  if (!player || rivali.length < 3) {
    return { leagueName, ties: [], promoted: false, winner: '' };
  }

  const forza = new Map<string, number>(
    [player, ...rivali].map((club) => [club.name, clubStrength(club)]),
  );

  const gioca = (casa: string, ospite: string, round: PlayoffTie['round']): PlayoffTie => {
    const scarto = (forza.get(casa) ?? 70) - (forza.get(ospite) ?? 70);
    const vinceCasa = rng.chance(0.5 + scarto * 0.03);
    const gol = rng.int(1, 3);
    const subiti = rng.int(0, gol - 1);
    return {
      round,
      home: casa,
      away: ospite,
      homeGoals: vinceCasa ? gol : subiti,
      awayGoals: vinceCasa ? subiti : gol,
      playerInvolved: casa === player.name || ospite === player.name,
    };
  };

  const semi1 = gioca(player.name, rivali[2]!.name, 'semifinale');
  const semi2 = gioca(rivali[0]!.name, rivali[1]!.name, 'semifinale');
  const vince1 = semi1.homeGoals > semi1.awayGoals ? semi1.home : semi1.away;
  const vince2 = semi2.homeGoals > semi2.awayGoals ? semi2.home : semi2.away;
  const finale = gioca(vince1, vince2, 'finale');
  const winner = finale.homeGoals > finale.awayGoals ? finale.home : finale.away;

  return {
    leagueName,
    ties: [semi1, semi2, finale],
    promoted: winner === player.name,
    winner,
  };
}
