import type { Role } from './types.js';

const ROLE_BY_POSITION: Record<string, Role> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  ST: 'FWD', CF: 'FWD', LW: 'FWD', RW: 'FWD',
};

/** Il dataset elenca più posizioni ("CM, CAM"): vale la prima. */
export function toRole(positions: string): Role {
  const first = positions.split(',')[0]?.trim().toUpperCase() ?? '';
  return ROLE_BY_POSITION[first] ?? 'MID';
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** I nomi dei campionati si ripetono fra paesi: l'id numerico li disambigua. */
export function leagueIdOf(leagueName: string, leagueId: string): string {
  const numeric = Math.round(Number(leagueId));
  const suffix = Number.isFinite(numeric) ? String(numeric) : slugify(leagueId);
  return `${slugify(leagueName)}-${suffix}`;
}

export function toLevel(raw: string): number {
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && value >= 1 ? value : 1;
}
