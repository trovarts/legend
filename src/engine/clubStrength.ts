import type { Club, Role } from '../world/types';
import type { Rng } from './rng';

const SQUAD_SIZE = 11;
/** Quanto la classifica si discosta dalla forza pura: senza sorprese non è calcio. */
const UPSET_SPREAD = 3.5;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Forza di una squadra: la media dei suoi undici migliori. */
export function clubStrength(club: Club): number {
  const best = [...club.squad]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, SQUAD_SIZE);
  if (best.length === 0) return 0;
  return round1(best.reduce((sum, player) => sum + player.overall, 0) / best.length);
}

/**
 * Forza della squadra tenendo conto del giocatore dell'utente, pesata sui minuti:
 * un fuoriclasse in panchina non sposta la classifica.
 */
export function clubStrengthWith(
  club: Club,
  playerOverall: number,
  playerRole: Role,
  minutesShare: number,
): number {
  const base = clubStrength(club);
  const others = [...club.squad]
    .filter((mate) => mate.role === playerRole)
    .sort((a, b) => b.overall - a.overall);
  const replaced = others[0]?.overall ?? base;
  const delta = ((playerOverall - replaced) / SQUAD_SIZE) * minutesShare;
  return round1(base + delta);
}

/**
 * Posizione finale in campionato: dalla forza, con il rumore di una stagione vera.
 * Le sorprese esistono, ma la squadra più forte resta favorita.
 */
export function leaguePosition(
  strength: number,
  allStrengths: readonly number[],
  rng: Rng,
  /**
   * La forza del proprio club nell'elenco, quando è diversa da `strength`.
   * Serve perché `strength` comprende già il contributo del giocatore: senza questo
   * il club non si riconosce nella lista, resta in gara con se stesso e il campionato
   * finisce per avere una posizione in più di quante squadre ha.
   */
  ownStrength: number = strength,
): number {
  const others = [...allStrengths];
  const self = others.indexOf(ownStrength);
  if (self >= 0) others.splice(self, 1);

  const mine = strength + (rng.next() - 0.5) * 2 * UPSET_SPREAD;
  const better = others.filter(
    (value) => value + (rng.next() - 0.5) * 2 * UPSET_SPREAD > mine,
  ).length;
  return Math.min(others.length + 1, better + 1);
}
