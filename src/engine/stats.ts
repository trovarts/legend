import type { Role } from '../world/types.js';
import type { Rng } from './rng.js';
import type { SeasonStats } from './types.js';

export interface SeasonStatsInput {
  overall: number;
  role: Role;
  minutesShare: number;
  clubStrength: number;
  /** 1 = massima serie. Più si scende, più è facile incidere. */
  leagueLevel: number;
}

const MATCHES_PER_SEASON = 38;
const MINUTES_PER_MATCH = 90;

/** Gol e assist attesi in una stagione piena, a overall 70, in una squadra media di prima divisione. */
const OUTPUT_BY_ROLE: Record<Role, { goals: number; assists: number }> = {
  GK: { goals: 0, assists: 0 },
  DEF: { goals: 1.5, assists: 2 },
  MID: { goals: 4, assists: 6 },
  FWD: { goals: 10, assists: 4 },
};

const CLEAN_SHEET_ROLES: readonly Role[] = ['GK', 'DEF'];

/** Estrae un intero attorno a una media, con la varianza di una stagione vera. */
function around(expected: number, rng: Rng): number {
  if (expected <= 0) return 0;
  const spread = 0.45;
  const factor = 1 + (rng.next() - 0.5) * 2 * spread;
  return Math.max(0, Math.round(expected * factor));
}

export function seasonStats(input: SeasonStatsInput, rng: Rng): SeasonStats {
  const minutes = Math.round(MATCHES_PER_SEASON * MINUTES_PER_MATCH * input.minutesShare);
  // Le presenze devono poter contenere i minuti: con quote molto basse l'arrotondamento
  // per difetto produceva stagioni impossibili, tipo 106 minuti in una sola partita.
  const appearances = Math.min(
    MATCHES_PER_SEASON,
    Math.max(
      Math.round(MATCHES_PER_SEASON * Math.min(1, input.minutesShare * 1.25)),
      Math.ceil(minutes / MINUTES_PER_MATCH),
    ),
  );

  const talent = (input.overall / 70) ** 3;
  // In quarta serie si incide di più: gli avversari sono più deboli.
  const levelBonus = 1 + (input.leagueLevel - 1) * 0.12;
  const seasonFraction = minutes / (MATCHES_PER_SEASON * MINUTES_PER_MATCH);
  const output = OUTPUT_BY_ROLE[input.role];

  const goals = around(output.goals * talent * levelBonus * seasonFraction, rng);
  const assists = around(output.assists * talent * levelBonus * seasonFraction, rng);

  const cleanSheets = CLEAN_SHEET_ROLES.includes(input.role)
    ? around(appearances * (0.05 + Math.max(0, input.clubStrength - 60) * 0.012), rng)
    : 0;

  const contribution = input.role === 'GK'
    ? cleanSheets / Math.max(1, appearances)
    : (goals + assists) / Math.max(1, appearances);
  const rawRating =
    6 + (input.overall - 70) * 0.025 + contribution * 0.8 + (rng.next() - 0.5) * 0.4;
  const rating = Math.round(Math.min(9, Math.max(5, rawRating)) * 10) / 10;

  return {
    appearances: minutes === 0 ? 0 : appearances,
    minutes,
    goals,
    assists,
    cleanSheets: Math.min(cleanSheets, appearances),
    rating,
  };
}
