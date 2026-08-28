import type { Rng } from './rng';

/**
 * Salire e scendere di categoria.
 *
 * Finché una promozione è solo una schermata, la piramide è un disegno. Qui il
 * verdetto è vincolante: la stagione dopo il club è davvero in un'altra divisione,
 * con altri avversari e un'altra forza attorno. È il motivo per cui vale la pena
 * cominciare in quarta serie.
 */
export type Movement = 'promosso' | 'retrocesso' | null;

/** Chi arriva in questa forbice si gioca la promozione ai playoff. */
export const PLAYOFF_FROM = 3;
export const PLAYOFF_TO = 6;
/** Quante squadre retrocedono dal fondo della classifica. */
const RETROCESSE = 3;
/** Ai playoff ci sono quattro squadre: una sola sale. */
const CHANCE_PLAYOFF = 0.25;

export interface MovementInput {
  position: number;
  clubCount: number;
  leagueLevel: number;
  /** Esiste una divisione superiore in cui salire? */
  hasHigher: boolean;
  /** Esiste una divisione inferiore in cui cadere? */
  hasLower: boolean;
}

export interface MovementOutcome {
  movement: Movement;
  /** La promozione è passata dai playoff: è quella che si guarda partita per partita. */
  viaPlayoff: boolean;
}

export function inPlayoffZone(position: number, leagueLevel: number): boolean {
  return leagueLevel > 1 && position >= PLAYOFF_FROM && position <= PLAYOFF_TO;
}

export function resolveMovement(input: MovementInput, rng: Rng): MovementOutcome {
  const { position, clubCount, leagueLevel, hasHigher, hasLower } = input;

  if (hasHigher && leagueLevel > 1) {
    if (position <= 2) return { movement: 'promosso', viaPlayoff: false };
    if (inPlayoffZone(position, leagueLevel)) {
      return { movement: rng.chance(CHANCE_PLAYOFF) ? 'promosso' : null, viaPlayoff: true };
    }
  }

  if (hasLower && position > clubCount - RETROCESSE) {
    return { movement: 'retrocesso', viaPlayoff: false };
  }

  return { movement: null, viaPlayoff: false };
}
