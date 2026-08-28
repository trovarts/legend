import type { Club } from '../world/types.js';
import { resolveAwards } from './awards.js';
import { clubStrengthWith, leaguePosition } from './clubStrength.js';
import { resolveTrophies } from './competitions.js';
import { growPlayer } from './growth.js';
import { generateOffers, type CandidateClub } from './market.js';
import { nationalSeason } from './national.js';
import { playingTimeShare } from './playingTime.js';
import type { Rng } from './rng.js';
import { seasonStats } from './stats.js';
import type { CareerPlayer, SeasonRecord } from './types.js';
import { marketValue } from './value.js';

export interface SimulateSeasonInput {
  season: number;
  player: CareerPlayer;
  club: Club;
  league: { id: string; name: string; level: number; clubCount: number };
  /** Forza di tutti i club del campionato, per la classifica. */
  leagueStrengths: readonly number[];
  qualifiedToContinental: boolean;
  candidates: readonly CandidateClub[];
  alreadyCapped: boolean;
}

export interface SeasonOutcome {
  record: SeasonRecord;
  grownPlayer: CareerPlayer;
  /** I primi quattro giocano la coppa continentale l'anno dopo. */
  qualifiedNextSeason: boolean;
}

const CONTINENTAL_SPOTS = 4;

/** Risolve una stagione intera: campo, classifica, trofei, premi, nazionale, mercato. */
export function simulateSeason(input: SimulateSeasonInput, rng: Rng): SeasonOutcome {
  const { player, club, league } = input;

  const minutesShare = playingTimeShare(
    { overall: player.overall, age: player.age, role: player.role },
    club.squad,
  );
  const strength = clubStrengthWith(club, player.overall, player.role, minutesShare);
  const position = leaguePosition(strength, input.leagueStrengths, rng);

  const stats = seasonStats(
    {
      overall: player.overall,
      role: player.role,
      minutesShare,
      clubStrength: strength,
      leagueLevel: league.level,
    },
    rng,
  );

  const trophies = resolveTrophies(
    {
      season: input.season,
      leagueName: league.name,
      position,
      clubCount: league.clubCount,
      qualifiedToContinental: input.qualifiedToContinental,
      minutesShare,
    },
    rng,
  );

  const awards = resolveAwards(
    {
      season: input.season,
      leagueName: league.name,
      leagueLevel: league.level,
      age: player.age,
      role: player.role,
      stats,
      position,
    },
    rng,
  );

  const national = nationalSeason(
    {
      season: input.season,
      age: player.age,
      overall: player.overall,
      role: player.role,
      stats,
      leagueLevel: league.level,
      alreadyCapped: input.alreadyCapped,
    },
    rng,
  );

  const grownPlayer = growPlayer(player, minutesShare, rng);
  const valueEur = marketValue(grownPlayer.overall, grownPlayer.age, grownPlayer.potential);

  const offers = generateOffers(
    {
      player: {
        overall: grownPlayer.overall,
        age: grownPlayer.age,
        potential: grownPlayer.potential,
        role: grownPlayer.role,
      },
      currentClubId: club.id,
      currentMinutesShare: minutesShare,
      stats,
      candidates: input.candidates,
    },
    rng,
  );

  return {
    record: {
      season: input.season,
      age: player.age,
      clubId: club.id,
      clubName: club.name,
      leagueId: league.id,
      leagueName: league.name,
      leagueLevel: league.level,
      minutesShare,
      overallStart: player.overall,
      overallEnd: grownPlayer.overall,
      stats,
      position,
      trophies,
      awards,
      national,
      valueEur,
      offers,
    },
    grownPlayer,
    qualifiedNextSeason: position <= CONTINENTAL_SPOTS,
  };
}
