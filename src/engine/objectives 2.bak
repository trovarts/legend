import type { CupRound } from './competitions';
import type { Rng } from './rng';
import type { Role } from '../world/types';
import type { SeasonStats } from './types';

/**
 * Cosa il club ti chiede quest'anno.
 *
 * Senza obiettivi una stagione è solo una riga di statistiche: finisce, e non è
 * finita bene o male, è finita e basta. Con un obiettivo dichiarato ad agosto, il
 * quattordicesimo posto di maggio diventa una notizia — e in due modi diversi a
 * seconda di cosa ti avevano chiesto.
 */
export type ObjectiveKind =
  | 'titolo' | 'piazzamento' | 'salvezza'
  | 'coppa' | 'minuti' | 'gol' | 'assist' | 'media' | 'porta' | 'nazionale';

export interface Objective {
  kind: ObjectiveKind;
  /** Il testo mostrato: già in italiano, già con il numero dentro. */
  text: string;
  target: number;
}

export interface ClubObjectives {
  primary: Objective;
  secondary: Objective;
}

export interface ObjectivesInput {
  /** Dove il club dovrebbe arrivare secondo la forza della rosa, 1-based. */
  expectedPosition: number;
  clubCount: number;
  role: Role;
  /** Il nome vero della coppa del paese. */
  cupName: string;
}

/**
 * La media voto che si può davvero chiedere, ruolo per ruolo.
 *
 * Un attaccante da 82 di overall in una buona squadra chiude a 6.7 nelle stagioni
 * migliori, un difensore a 6.6: chiedere «almeno 6.8» a un difensore era chiedergli
 * una cosa che il modello non produce. Un obiettivo irraggiungibile non è difficile,
 * è rotto.
 */
const MEDIA_CHIEDIBILE: Record<Role, number> = { GK: 6.4, DEF: 6.3, MID: 6.5, FWD: 6.6 };

const NOMI_TURNO: Record<number, string> = {
  1: 'gli ottavi', 2: 'i quarti', 3: 'la semifinale', 4: 'la finale', 5: 'la vittoria',
};

/** L'obiettivo di squadra: quello che il presidente dice in conferenza. */
function principale(input: ObjectivesInput): Objective {
  const { expectedPosition, clubCount } = input;

  if (expectedPosition === 1) {
    return { kind: 'titolo', text: 'Vincere il campionato', target: 1 };
  }
  if (expectedPosition > clubCount - 5) {
    const soglia = Math.max(1, clubCount - 3);
    return { kind: 'salvezza', text: 'Salvarsi senza passare dai playout', target: soglia };
  }
  // Un po' di ambizione: si chiede una posizione appena migliore di quella attesa.
  const soglia = Math.max(1, Math.min(clubCount - 1, expectedPosition - 1));
  return { kind: 'piazzamento', text: `Chiudere almeno al ${soglia}° posto`, target: soglia };
}

/** L'obiettivo personale: quello che ti dicono negli spogliatoi. */
function secondario(input: ObjectivesInput, rng: Rng): Objective {
  const forte = input.expectedPosition <= Math.max(2, Math.round(input.clubCount / 3));
  const opzioni: Objective[] = [
    {
      kind: 'coppa',
      text: `Raggiungere ${NOMI_TURNO[forte ? 3 : 1]} di ${input.cupName.toLowerCase()}`,
      target: forte ? 3 : 1,
    },
    { kind: 'minuti', text: 'Giocare almeno metà dei minuti stagionali', target: 50 },
    {
      kind: 'media',
      text: `Chiudere con una media voto di almeno ${MEDIA_CHIEDIBILE[input.role].toFixed(1)}`,
      target: MEDIA_CHIEDIBILE[input.role],
    },
  ];

  if (input.role === 'FWD') opzioni.push({ kind: 'gol', text: 'Segnare almeno 8 gol', target: 8 });
  if (input.role === 'MID') opzioni.push({ kind: 'assist', text: 'Servire almeno 5 assist', target: 5 });
  if (input.role === 'GK') {
    opzioni.push({ kind: 'porta', text: 'Tenere la porta inviolata almeno 8 volte', target: 8 });
  }
  if (input.role === 'DEF') {
    opzioni.push({ kind: 'porta', text: 'Tenere la porta inviolata almeno 6 volte', target: 6 });
  }

  return opzioni[rng.int(0, opzioni.length - 1)] ?? opzioni[0]!;
}

export function seasonObjectives(input: ObjectivesInput, rng: Rng): ClubObjectives {
  return { primary: principale(input), secondary: secondario(input, rng) };
}

export interface ObjectivesResult {
  primary: boolean;
  secondary: boolean;
}

export function judgeObjectives(
  objectives: ClubObjectives,
  esito: {
    position: number;
    cupRound: CupRound;
    minutesShare: number;
    stats: SeasonStats;
    capped: boolean;
  },
): ObjectivesResult {
  const raggiunto = (obiettivo: Objective): boolean => {
    switch (obiettivo.kind) {
      case 'titolo':
      case 'piazzamento':
      case 'salvezza':
        return esito.position <= obiettivo.target;
      case 'coppa':
        return esito.cupRound >= obiettivo.target;
      case 'minuti':
        return esito.minutesShare * 100 >= obiettivo.target;
      case 'gol':
        return esito.stats.goals >= obiettivo.target;
      case 'assist':
        return esito.stats.assists >= obiettivo.target;
      case 'media':
        return esito.stats.rating >= obiettivo.target;
      case 'porta':
        return esito.stats.cleanSheets >= obiettivo.target;
      case 'nazionale':
        return esito.capped;
    }
  };

  return { primary: raggiunto(objectives.primary), secondary: raggiunto(objectives.secondary) };
}
