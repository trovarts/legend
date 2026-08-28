import { DecisionRequired, runCareer, type PendingDecision } from './career';
import type { CreatePlayerInput } from './create';
import type { CandidateClub } from './market';
import type { TrainingAxis } from './training';
import type { CareerResult, SeasonRecord } from './types';

/** Le decisioni prese dall'utente. Chiavi stringa: finiscono in JSON. */
export interface CareerDecisions {
  training: Record<string, TrainingAxis>;
  dilemmas: Record<string, string>;
  /** Per stagione: l'id del club scelto, oppure 'resta'. */
  transfers: Record<string, string>;
}

/**
 * Tutto il salvataggio: un seed e la lista delle scelte.
 * Pesa meno di un SMS e ricostruisce la carriera esatta (spec §5.4).
 */
export interface CareerSave {
  version: number;
  seed: number;
  create: CreatePlayerInput;
  startClubId: string;
  decisions: CareerDecisions;
}

export type Pending = PendingDecision | null;

export interface PlayState {
  seasons: SeasonRecord[];
  pending: Pending;
  finished: boolean;
  result: CareerResult | null;
}

export function decisionKey(season: number, dilemmaId: string): string {
  return `${season}:${dilemmaId}`;
}

/**
 * Rigioca la carriera dal seed e dalle decisioni registrate, fermandosi alla prima
 * decisione mancante. È il cuore dell'interfaccia: nessuno stato mutabile, solo una
 * funzione pura dallo stesso salvataggio alla stessa schermata.
 */
export function playCareer(save: CareerSave, clubs: readonly CandidateClub[]): PlayState {
  const seasons: SeasonRecord[] = [];

  try {
    const result = runCareer({
      create: save.create,
      world: { clubs, startClubId: save.startClubId },
      seed: save.seed,
      onSeason: (record) => seasons.push(record),
      trainingPolicy: (season, snapshot) => {
        const chosen = save.decisions.training[String(season)];
        if (!chosen) {
          throw new DecisionRequired({
            kind: 'training',
            season,
            age: snapshot.age,
            overall: snapshot.overall,
            clubName: snapshot.clubName,
          });
        }
        return chosen;
      },
      dilemmaPolicy: (dilemma, context) => {
        const chosen = save.decisions.dilemmas[decisionKey(context.season, dilemma.id)];
        const option = dilemma.options.find((item) => item.id === chosen);
        if (!option) {
          throw new DecisionRequired({
            kind: 'dilemma',
            season: context.season,
            dilemma,
            soFar: context.soFar ?? {
              clubName: context.clubName,
              leagueName: '',
              position: 0,
              stats: { appearances: 0, minutes: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 6 },
              injury: context.injury,
              minutesShare: context.minutesShare,
            },
          });
        }
        return option;
      },
      policy: (offers, context) => {
        const chosen = save.decisions.transfers[String(context.season)];
        if (chosen === undefined) {
          throw new DecisionRequired({ kind: 'transfer', season: context.season, offers: [...offers] });
        }
        if (chosen === 'resta') return null;
        return offers.find((offer) => offer.clubId === chosen) ?? null;
      },
    });

    return { seasons, pending: null, finished: true, result };
  } catch (error) {
    if (error instanceof DecisionRequired) {
      return { seasons, pending: error.pending, finished: false, result: null };
    }
    throw error;
  }
}
