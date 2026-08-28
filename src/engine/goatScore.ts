import type { Role } from '../world/types';
import type { Award, GoatComponent, GoatScore, SeasonRecord, Showdown, Trophy } from './types';

export interface GoatInput {
  role: Role;
  seasons: readonly SeasonRecord[];
  trophies: readonly Trophy[];
  awards: readonly Award[];
  peakOverall: number;
  peakValueEur: number;
  totalCaps: number;
  /** Livello del campionato in cui è cominciata la carriera: partire in basso vale di più. */
  startingLeagueLevel: number;
  showdowns: readonly Showdown[];
  seasonsAheadOfRival: number;
}

const WEIGHTS: Record<GoatComponent, number> = {
  performance: 0.2,
  trophies: 0.15,
  awards: 0.12,
  national: 0.1,
  peakOverall: 0.12,
  peakValue: 0.08,
  longevity: 0.08,
  rival: 0.1,
  difficulty: 0.05,
};

/** Porta un valore grezzo su una scala 0-100, saturando dolcemente verso l'alto. */
function scale(value: number, reference: number): number {
  if (value <= 0) return 0;
  return Math.min(100, (value / (value + reference)) * 200);
}

/**
 * Il rendimento è l'unica voce normalizzata per ruolo: a un portiere si chiedono
 * clean sheet e parate, a un attaccante gol (spec §3.7).
 */
function performanceOf(role: Role, seasons: readonly SeasonRecord[]): number {
  if (seasons.length === 0) return 0;
  const totals = seasons.reduce(
    (sum, season) => ({
      goals: sum.goals + season.stats.goals,
      assists: sum.assists + season.stats.assists,
      cleanSheets: sum.cleanSheets + season.stats.cleanSheets,
      appearances: sum.appearances + season.stats.appearances,
      rating: sum.rating + season.stats.rating * season.stats.appearances,
    }),
    { goals: 0, assists: 0, cleanSheets: 0, appearances: 0, rating: 0 },
  );

  const averageRating = totals.appearances > 0 ? totals.rating / totals.appearances : 0;
  const volume = scale(totals.appearances, 300);

  const production =
    role === 'GK'
      ? scale(totals.cleanSheets * 4, 250)
      : role === 'DEF'
        ? scale(totals.goals * 6 + totals.assists * 4 + totals.cleanSheets * 3, 300)
        : role === 'MID'
          ? scale(totals.goals * 3 + totals.assists * 3, 300)
          : scale(totals.goals * 2 + totals.assists * 1.5, 300);

  const quality = Math.min(100, Math.max(0, (averageRating - 5.8) * 45));
  return Math.min(100, production * 0.5 + volume * 0.2 + quality * 0.3);
}

export function computeGoatScore(input: GoatInput): GoatScore {
  const trophyWeight = input.trophies.reduce(
    (sum, trophy) => sum + (trophy.kind === 'continental' ? 3 : trophy.kind === 'league' ? 2 : 1),
    0,
  );
  const showdownScore = input.showdowns.reduce((sum, showdown) => sum + (showdown.won ? 12 : -4), 0);
  const seasonCount = Math.max(1, input.seasons.length);

  const components: Record<GoatComponent, number> = {
    performance: performanceOf(input.role, input.seasons),
    trophies: scale(trophyWeight, 12),
    awards: scale(input.awards.length * 3, 12),
    national: scale(input.totalCaps, 60),
    peakOverall: Math.min(100, Math.max(0, (input.peakOverall - 55) * 2.6)),
    peakValue: scale(input.peakValueEur / 1_000_000, 60),
    longevity: scale(input.seasons.length, 14),
    rival: Math.min(
      100,
      Math.max(0, (input.seasonsAheadOfRival / seasonCount) * 80 + showdownScore),
    ),
    difficulty: Math.min(100, (input.startingLeagueLevel - 1) * 30),
  };

  const total = Math.round(
    (Object.keys(WEIGHTS) as GoatComponent[]).reduce(
      (sum, key) => sum + components[key] * WEIGHTS[key],
      0,
    ) * 10,
  );

  return { total: Math.min(1000, Math.max(0, total)), components };
}
