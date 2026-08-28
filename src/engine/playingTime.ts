import type { Role, WorldPlayer } from '../world/types.js';

/** Posti da titolare per reparto: davanti a un portiere c'è un solo posto, davanti a un difensore quattro. */
const STARTING_SLOTS: Record<Role, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

const MIN_SHARE = 0.02;
const MAX_SHARE = 0.95;

/**
 * Quota di minuti stagionali, dal confronto con i concorrenti veri dello stesso ruolo.
 * È la valuta della carriera: chi non gioca non cresce (spec §3.3).
 */
export function playingTimeShare(
  overall: number,
  role: Role,
  squad: readonly WorldPlayer[],
): number {
  const slots = STARTING_SLOTS[role];
  const better = squad.filter(
    (player) => player.role === role && player.overall > overall,
  ).length;

  const share =
    better < slots
      ? 0.9 - better * 0.08
      : 0.45 - (better - slots + 1) * 0.12;

  return Math.min(MAX_SHARE, Math.max(MIN_SHARE, share));
}
