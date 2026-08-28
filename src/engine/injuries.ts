import { injuryRiskModifier } from './marks';
import type { Rng } from './rng';
import type { Injury, InjurySeverity, Mark } from './types';

export interface InjuryInput {
  season: number;
  age: number;
  physique: number;
  minutesShare: number;
  marks: readonly Mark[];
}

const MATCHES_PER_SEASON = 38;

const SEVERITY_TABLE: readonly { severity: InjurySeverity; upTo: number; min: number; max: number }[] = [
  { severity: 'lieve', upTo: 0.7, min: 2, max: 5 },
  { severity: 'seria', upTo: 0.95, min: 8, max: 16 },
  { severity: 'grave', upTo: 1, min: 22, max: 34 },
];

export function rollInjury(input: InjuryInput, rng: Rng): Injury | null {
  const base = 0.1 + Math.max(0, input.age - 29) * 0.015 + (1 - input.physique / 100) * 0.12;
  // Ci si fa male in campo: chi resta in tribuna non si infortuna.
  const exposure = input.minutesShare;
  const risk = base * exposure * (1 + injuryRiskModifier(input.marks));

  if (!rng.chance(risk)) return null;

  const roll = rng.next();
  const row = SEVERITY_TABLE.find((entry) => roll <= entry.upTo) ?? SEVERITY_TABLE[0]!;
  return { severity: row.severity, matchesOut: rng.int(row.min, row.max), season: input.season };
}

/** Quota di stagione persa per infortunio, fra 0 e 1. */
export function injuryMinutesPenalty(injury: Injury | null): number {
  if (!injury) return 0;
  return Math.min(1, injury.matchesOut / MATCHES_PER_SEASON);
}
