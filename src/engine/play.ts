import { DecisionRequired, runCareer, type PendingDecision } from './career';
import type { CreatePlayerInput } from './create';
import type { CandidateClub } from './market';
import type { Agent } from './agent';
import { agentById, offerAgents } from './agent';
import { createRng } from './rng';
import type { TrainingAxis } from './training';
import type { CareerResult, RivalSnapshot, SeasonRecord } from './types';
import type { YouthApproach, YouthSeason } from './youth';
import { playYouthSeason, YOUTH_LAST_AGE, YOUTH_START_AGE } from './youth';

/** Le decisioni prese dall'utente. Chiavi stringa: finiscono in JSON. */
export interface CareerDecisions {
  training: Record<string, TrainingAxis>;
  dilemmas: Record<string, string>;
  /** Per stagione: l'id del club scelto, oppure 'resta'. */
  transfers: Record<string, string>;
  /** L'agente scelto all'inizio della carriera. */
  agentId?: string;
  /** Per anno di vivaio: come si è scelto di crescere. */
  youth?: Record<string, YouthApproach>;
  /** L'anno in cui si è deciso di salire in prima squadra. */
  promotedAt?: number;
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

/** Le decisioni che vengono prima della prima squadra. */
export type EarlyPending =
  | { kind: 'agent'; options: Agent[] }
  | { kind: 'youth'; year: number; age: number; clubName: string; overall: number }
  | { kind: 'promotion'; age: number; clubName: string; overall: number };

export type Pending = PendingDecision | EarlyPending | null;

export interface PlayState {
  /** Gli anni di vivaio, prima della prima squadra. */
  youth: YouthSeason[];
  agent: Agent | null;
  seasons: SeasonRecord[];
  /** Come stava andando il Rivale a ogni stagione, nello stesso ordine. */
  rivals: (RivalSnapshot | null)[];
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
  const rivals: (RivalSnapshot | null)[] = [];

  // ── Prima della prima squadra: l'agente e gli anni di vivaio ──────────────
  const early = createRng(save.seed ^ 0x5bf03635);
  const agent = save.decisions.agentId ? agentById(save.decisions.agentId) ?? null : null;
  if (agent === null) {
    return {
      youth: [], agent: null, seasons, rivals,
      pending: { kind: 'agent', options: offerAgents(early) },
      finished: false, result: null,
    };
  }

  const clubDiPartenza =
    clubs.find((entry) => entry.club.id === save.startClubId)?.club.name ?? 'il club';
  const youth: YouthSeason[] = [];
  let overall = 40 + (save.create.age - YOUTH_START_AGE) * 2;
  const potential = 55 + (save.seed % 35);
  let age = YOUTH_START_AGE;
  let year = 1;

  while (age <= YOUTH_LAST_AGE) {
    if (save.decisions.promotedAt !== undefined && year > save.decisions.promotedAt) break;

    const scelta = save.decisions.youth?.[String(year)];
    if (scelta === undefined) {
      return {
        youth, agent, seasons, rivals,
        pending: { kind: 'youth', year, age, clubName: clubDiPartenza, overall },
        finished: false, result: null,
      };
    }

    const stagione = playYouthSeason(
      { year, age, clubName: clubDiPartenza, overall, potential, approach: scelta },
      createRng((save.seed ^ 0x2545f491) + year * 6151),
    );
    youth.push(stagione);
    overall = stagione.overallEnd;
    age += 1;
    year += 1;

    // Dal secondo anno il club chiede se è ora di salire.
    if (age > YOUTH_START_AGE + 1 && save.decisions.promotedAt === undefined) {
      return {
        youth, agent, seasons, rivals,
        pending: { kind: 'promotion', age, clubName: clubDiPartenza, overall },
        finished: false, result: null,
      };
    }
  }

  try {
    const result = runCareer({
      create: save.create,
      world: { clubs, startClubId: save.startClubId },
      seed: save.seed,
      onSeason: (record, rival) => {
        seasons.push(record);
        rivals.push(rival);
      },
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

    return { youth, agent, seasons, rivals, pending: null, finished: true, result };
  } catch (error) {
    if (error instanceof DecisionRequired) {
      return { youth, agent, seasons, rivals, pending: error.pending, finished: false, result: null };
    }
    throw error;
  }
}
