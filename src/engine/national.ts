import type { Role } from '../world/types';
import type { Rng } from './rng';
import type { NationalSeason, SeasonStats } from './types';

export interface NationalInput {
  season: number;
  age: number;
  overall: number;
  role: Role;
  stats: SeasonStats;
  leagueLevel: number;
  /** Chi è già nel giro della nazionale ci resta più facilmente. */
  alreadyCapped: boolean;
}

const TOURNAMENT_STAGES: readonly string[] = [
  'gironi', 'ottavi', 'quarti', 'semifinale', 'finale', 'vittoria',
];

export function nationalSeason(input: NationalInput, rng: Rng): NationalSeason {
  const empty: NationalSeason = { capped: false, caps: 0, goals: 0, tournament: null };

  // Il ct guarda il livello, la stagione appena fatta e la categoria in cui giochi.
  const level = (input.overall - 74) * 0.09;
  const form = (input.stats.rating - 6.9) * 0.3;
  const leaguePenalty = (input.leagueLevel - 1) * 0.35;
  const loyalty = input.alreadyCapped ? 0.25 : 0;
  const chance = 0.35 + level + form + loyalty - leaguePenalty;

  if (!rng.chance(chance)) return empty;

  const caps = 4 + rng.int(0, 6);
  const scoringRate =
    input.role === 'FWD' ? 0.4 : input.role === 'MID' ? 0.2 : input.role === 'DEF' ? 0.06 : 0;
  const goals = Math.round(caps * scoringRate * (0.5 + rng.next()));

  const isTournamentYear = input.season % 2 === 0;
  if (!isTournamentYear) return { capped: true, caps, goals, tournament: null };

  // Più sei forte, più lontano arriva la tua nazionale: ma è comunque una lotteria.
  const push = Math.min(0.75, Math.max(0.1, (input.overall - 70) * 0.03));
  let stageIndex = 0;
  for (let i = 0; i < TOURNAMENT_STAGES.length - 1; i += 1) {
    if (rng.chance(push)) stageIndex += 1;
    else break;
  }

  return {
    capped: true,
    caps: caps + 3,
    goals,
    tournament: { name: 'Torneo Internazionale', stageReached: TOURNAMENT_STAGES[stageIndex]! },
  };
}
