import type { Role } from '../world/types';
import type { Rng } from './rng';
import type { Award, SeasonStats } from './types';

export interface AwardsInput {
  season: number;
  leagueName: string;
  leagueLevel: number;
  age: number;
  role: Role;
  stats: SeasonStats;
  position: number;
}

/** Gol che servono per essere in lotta per il titolo di capocannoniere in prima divisione. */
const TOP_SCORER_BAR = 24;
const MIN_APPEARANCES = 15;

export function resolveAwards(input: AwardsInput, rng: Rng): Award[] {
  const awards: Award[] = [];
  if (input.stats.appearances < MIN_APPEARANCES) return awards;

  // Più si scende di categoria, meno gol servono per dominare la classifica marcatori.
  const bar = TOP_SCORER_BAR - (input.leagueLevel - 1) * 4;

  if (input.role !== 'GK') {
    const margin = (input.stats.goals - bar) / bar;
    const chance = Math.min(0.85, Math.max(0, 0.35 + margin));
    if (margin > -0.5 && rng.chance(chance)) {
      awards.push({ kind: 'topScorer', season: input.season, competitionName: input.leagueName });
    }
  }

  const positionBonus = input.position === 1 ? 0.25 : input.position <= 4 ? 0.1 : 0;
  const mvpScore = (input.stats.rating - 7.4) * 0.6 + positionBonus;
  if (mvpScore > 0 && rng.chance(Math.min(0.6, mvpScore))) {
    awards.push({ kind: 'leagueMvp', season: input.season, competitionName: input.leagueName });
  }

  if (input.age <= 21) {
    const youngScore = (input.stats.rating - 7.0) * 0.5;
    if (youngScore > 0 && rng.chance(Math.min(0.6, youngScore))) {
      awards.push({ kind: 'youngPlayer', season: input.season, competitionName: input.leagueName });
    }
  }

  return awards;
}
