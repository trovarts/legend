import type { Role } from '../world/types';
import type { Rng } from './rng';

export type MatchEventKind =
  | 'inizio' | 'gol' | 'gol-subito' | 'occasione' | 'palo' | 'parata'
  | 'cartellino' | 'intervallo' | 'fine';

export interface MatchEvent {
  minute: number;
  kind: MatchEventKind;
  /** Vero se l'ha fatto il giocatore dell'utente. */
  mine: boolean;
  text: string;
}

export interface MatchStats {
  possesso: [number, number];
  tiri: [number, number];
  tiriInPorta: [number, number];
  corner: [number, number];
  falli: [number, number];
}

export interface MatchResult {
  home: string;
  away: string;
  goals: [number, number];
  events: MatchEvent[];
  stats: MatchStats;
  /** Gol e assist del giocatore dell'utente in questa partita. */
  playerGoals: number;
  playerAssists: number;
  playerRating: number;
}

export interface MatchInput {
  home: string;
  away: string;
  homeStrength: number;
  awayStrength: number;
  /** Il giocatore dell'utente gioca in casa? */
  playerAtHome: boolean;
  playerOverall: number;
  playerRole: Role;
  /** Quanto pesa: una finale genera più occasioni di un'amichevole. */
  importance: number;
}

const MINUTES = 90;

function frase(kind: MatchEventKind, chi: string, minuto: number): string {
  switch (kind) {
    case 'gol': return `${minuto}' — GOL! La mette dentro ${chi}.`;
    case 'gol-subito': return `${minuto}' — Gol di ${chi}.`;
    case 'occasione': return `${minuto}' — Occasione per ${chi}, che spreca.`;
    case 'palo': return `${minuto}' — Palo! ${chi} a un soffio dal gol.`;
    case 'parata': return `${minuto}' — Grande parata: ${chi} si salva.`;
    case 'cartellino': return `${minuto}' — Ammonito un giocatore di ${chi}.`;
    case 'intervallo': return 'Intervallo.';
    case 'fine': return 'Fine partita.';
    default: return 'Si comincia.';
  }
}

/**
 * Una partita raccontata minuto per minuto: serve alle occasioni che meritano di
 * essere viste — una finale, uno scontro col rivale, l'esordio. Deterministica come
 * tutto il resto: stesso seed, stessa partita.
 */
export function simulateMatch(input: MatchInput, rng: Rng): MatchResult {
  const forzaCasa = input.homeStrength + 2; // il campo vale qualcosa
  const forzaOspite = input.awayStrength;
  const divario = (forzaCasa - forzaOspite) / 20;

  const events: MatchEvent[] = [{ minute: 0, kind: 'inizio', mine: false, text: 'Si comincia.' }];
  const goals: [number, number] = [0, 0];
  const stats: MatchStats = {
    possesso: [50, 50], tiri: [0, 0], tiriInPorta: [0, 0], corner: [0, 0], falli: [0, 0],
  };

  let playerGoals = 0;
  let playerAssists = 0;

  const possessoCasa = Math.round(50 + divario * 12 + (rng.next() - 0.5) * 10);
  stats.possesso = [
    Math.min(75, Math.max(25, possessoCasa)),
    100 - Math.min(75, Math.max(25, possessoCasa)),
  ];

  for (let minute = 1; minute <= MINUTES; minute += 1) {
    if (minute === 46) {
      events.push({ minute: 45, kind: 'intervallo', mine: false, text: frase('intervallo', '', 45) });
    }

    // Quante volte succede qualcosa: più è importante, più la partita è viva.
    if (!rng.chance(0.055 * (0.85 + input.importance * 0.3))) continue;

    const perCasa = rng.chance(0.5 + divario * 0.12);
    const squadra = perCasa ? input.home : input.away;
    const indice = perCasa ? 0 : 1;
    const mia = perCasa === input.playerAtHome;

    stats.tiri[indice] += 1;

    // Il giocatore dell'utente incide di più se è forte e se è un attaccante.
    const suo = mia && rng.chance(
      (input.playerOverall / 130) * (input.playerRole === 'FWD' ? 1 : input.playerRole === 'MID' ? 0.6 : 0.25),
    );

    const esito = rng.next();
    if (esito < 0.3) {
      stats.tiriInPorta[indice] += 1;
      goals[indice] += 1;
      if (suo) playGoal();
      else if (mia && rng.chance(0.25)) playerAssists += 1;
      events.push({
        minute,
        kind: mia ? 'gol' : 'gol-subito',
        mine: mia,
        text: suo ? `${minute}' — GOL! Segna lui.` : frase(mia ? 'gol' : 'gol-subito', squadra, minute),
      });
    } else if (esito < 0.45) {
      stats.tiriInPorta[indice] += 1;
      events.push({ minute, kind: 'parata', mine: !mia, text: frase('parata', perCasa ? input.away : input.home, minute) });
    } else if (esito < 0.55) {
      events.push({ minute, kind: 'palo', mine: mia, text: frase('palo', squadra, minute) });
    } else if (esito < 0.75) {
      stats.corner[indice] += 1;
      events.push({ minute, kind: 'occasione', mine: mia, text: frase('occasione', squadra, minute) });
    } else {
      stats.falli[indice] += 1;
      if (rng.chance(0.3)) {
        events.push({ minute, kind: 'cartellino', mine: mia, text: frase('cartellino', squadra, minute) });
      }
    }
  }

  function playGoal(): void {
    playerGoals += 1;
  }

  events.push({ minute: 90, kind: 'fine', mine: false, text: 'Fine partita.' });

  const miei = input.playerAtHome ? goals[0] : goals[1];
  const loro = input.playerAtHome ? goals[1] : goals[0];
  const rating =
    6 + playerGoals * 0.8 + playerAssists * 0.4 + (miei > loro ? 0.3 : miei < loro ? -0.3 : 0);

  return {
    home: input.home,
    away: input.away,
    goals,
    events,
    stats,
    playerGoals,
    playerAssists,
    playerRating: Math.round(Math.min(10, Math.max(4, rating)) * 10) / 10,
  };
}
