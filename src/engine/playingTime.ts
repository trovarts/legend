import type { Role, WorldPlayer } from '../world/types.js';

export interface PlayingTimeInput {
  overall: number;
  age: number;
  role: Role;
}

/** Posti da titolare per reparto: davanti a un portiere c'è un solo posto, davanti a un difensore quattro. */
const STARTING_SLOTS: Record<Role, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

/** Quota di chi si prende l'ultimo posto da titolare. */
const STARTER_SHARE = 0.72;
/** Quanto rende ogni punto di overall sopra la soglia: da titolare il margine conta poco. */
const SHARE_PER_POINT_ABOVE = 0.02;
/** Quanto costa ogni punto sotto la soglia: fuori dai titolari si scende in fretta. */
const SHARE_PER_POINT_BELOW = 0.05;

const MAX_SHARE = 0.95;
const MIN_SHARE = 0.02;
/** I club fanno esordire i ragazzi: spezzoni, coppe, panchine lunghe. Non si resta mai a zero. */
const YOUNG_MIN_SHARE = 0.08;
const YOUNG_AGE = 21;

/**
 * Quota di minuti stagionali, dal divario con chi occupa l'ultimo posto da titolare
 * nel proprio reparto.
 *
 * Conta di QUANTO sei distante, non quanti ti stanno davanti: in una rosa vera da 28
 * giocatori il conteggio satura subito e condanna chiunque non sia già forte a non
 * giocare mai — e chi non gioca non cresce, quindi non gioca mai più.
 *
 * È la valuta della carriera (spec §3.3).
 */
export function playingTimeShare(
  player: PlayingTimeInput,
  squad: readonly WorldPlayer[],
): number {
  const slots = STARTING_SLOTS[player.role];
  const rivals = squad
    .filter((mate) => mate.role === player.role)
    .map((mate) => mate.overall)
    .sort((a, b) => b - a);

  // Livello dell'ultimo posto da titolare. Reparto scoperto: non c'è nessuno da superare.
  const threshold = rivals[slots - 1] ?? 0;
  const gap = player.overall - threshold;

  const share =
    gap >= 0
      ? STARTER_SHARE + gap * SHARE_PER_POINT_ABOVE
      : STARTER_SHARE + gap * SHARE_PER_POINT_BELOW;

  const floor = player.age <= YOUNG_AGE ? YOUNG_MIN_SHARE : MIN_SHARE;
  return Math.min(MAX_SHARE, Math.max(floor, share));
}
