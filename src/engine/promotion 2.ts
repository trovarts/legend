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

/**
 * I playoff di promozione: quattro squadre, due semifinali e una finale.
 * Chi vince sale di categoria — ed è il momento più teso di una stagione in serie minore.
 */
export function buildPlayoff(
  leagueName: string,
  clubs: readonly Club[],
  playerClubId: string,
  rng: Rng,
  /** Il verdetto e' gia' stato deciso dal motore: qui si racconta, non si estrae. */
  esitoImposto?: boolean,
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

  // Con un verdetto imposto la semifinale del giocatore non puo' contraddirlo.
  const semi1 = (() => {
    for (let tentativo = 0; tentativo < 12; tentativo += 1) {
      const tie = gioca(player.name, rivali[2]!.name, 'semifinale');
      if (esitoImposto !== true || tie.homeGoals > tie.awayGoals) return tie;
    }
    return { round: 'semifinale' as const, home: player.name, away: rivali[2]!.name, homeGoals: 1, awayGoals: 0, playerInvolved: true };
  })();
  const semi2 = gioca(rivali[0]!.name, rivali[1]!.name, 'semifinale');
  const vince1 = semi1.homeGoals > semi1.awayGoals ? semi1.home : semi1.away;
  const vince2 = semi2.homeGoals > semi2.awayGoals ? semi2.home : semi2.away;
  const finale = (() => {
    for (let tentativo = 0; tentativo < 12; tentativo += 1) {
      const tie = gioca(vince1, vince2, 'finale');
      if (esitoImposto === undefined) return tie;
      const vince = tie.homeGoals > tie.awayGoals ? tie.home : tie.away;
      if ((vince === player.name) === esitoImposto) return tie;
    }
    const suoi = vince1 === player.name;
    return {
      round: 'finale' as const, home: vince1, away: vince2,
      homeGoals: suoi === esitoImposto ? 1 : 0,
      awayGoals: suoi === esitoImposto ? 0 : 1,
      playerInvolved: vince1 === player.name || vince2 === player.name,
    };
  })();
  const winner = finale.homeGoals > finale.awayGoals ? finale.home : finale.away;

  return {
    leagueName,
    ties: [semi1, semi2, finale],
    promoted: winner === player.name,
    winner,
  };
}
