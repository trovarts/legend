import { DecisionRequired, runCareer, type PendingDecision } from './career';
import { createPlayer, type CreatePlayerInput } from './create';
import type { CandidateClub } from './market';
import type { Agent } from './agent';
import { agentById, offerAgents } from './agent';
import { addMark } from './marks';
import { createRng } from './rng';
import type { RequestKind } from './agentRequest';
import type { PlayStyle } from './playstyle';
import type { TrainingAxis } from './training';
import type { CareerResult, Dilemma, Mark, RivalSnapshot, SeasonRecord } from './types';
import type { YouthApproach, YouthSeason } from './youth';
import { playYouthSeason, YOUTH_LAST_AGE, YOUTH_START_AGE } from './youth';
import type { YouthEpisode } from './youthEvents';
import { pickYouthEvent, resolveYouthOption } from './youthEvents';

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
  /** Per anno di vivaio: come si è risposto all'episodio di quell'anno. */
  youthEvents?: Record<string, string>;
  /** L'anno in cui si è deciso di salire in prima squadra. */
  promotedAt?: number;
  /** Come interpreta il ruolo. */
  style?: PlayStyle;
  /** La posizione precisa in campo, per il racconto: ST, CAM, CB... */
  position?: string;
  /** Cosa è stato chiesto all'agente, stagione per stagione. */
  requests?: Record<string, RequestKind>;
  /** Com'è fatto: indici dell'avatar. Non tocca la simulazione, si vede e basta. */
  look?: { pelle: number; capelli: number; espressione: number; divisa: number; scarpini: number };
  /** Il numero di maglia e il piede preferito. */
  numero?: string;
  piede?: 'Destro' | 'Sinistro';
  /** Come si guardano le stagioni: tutto d'un fiato o passo per passo. */
  modo?: 'classica' | 'dettagliata';
  /** Cosa vuoi che questa carriera sia: si sceglie prima e si giudica alla fine. */
  ambizione?: string;
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
  | {
      kind: 'youth-event';
      year: number;
      age: number;
      clubName: string;
      overall: number;
      dilemma: Dilemma;
      /** L'anno appena giocato, non ancora chiuso: l'episodio ne fa parte. */
      season: YouthSeason;
    }
  | { kind: 'promotion'; age: number; clubName: string; overall: number };

export type Pending = PendingDecision | EarlyPending | null;

export interface PlayState {
  /** Gli anni di vivaio, prima della prima squadra. */
  youth: YouthSeason[];
  /** Gli episodi capitati nel vivaio, uno per anno. */
  episodes: YouthEpisode[];
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
/** Come si è chiuso il vivaio: quello che la prima squadra eredita. */
export interface YouthOutcome {
  youth: YouthSeason[];
  episodes: YouthEpisode[];
  /** L'overall e l'età con cui si entra in prima squadra. */
  overall: number;
  age: number;
  /** I segni e i minuti che gli episodi si portano dietro. */
  startMarks: Mark[];
  startMinutesBonus: number;
  /** La decisione che manca, se il vivaio non è ancora finito. */
  pending: EarlyPending | null;
}

/**
 * Gli anni di vivaio, dal primo giorno all'ingresso in prima squadra.
 *
 * Sta fuori da `playCareer` perché è una cosa sua — e perché così il laboratorio può
 * giocarlo da solo, senza rigiocare vent'anni di carriera a ogni decisione.
 */
export function runYouth(input: {
  seed: number;
  create: CreatePlayerInput;
  clubName: string;
  decisions: CareerDecisions;
  /** Il tetto del giocatore vero: nel vivaio non lo si supera. */
  potential: number;
}): YouthOutcome {
  const { seed, decisions, clubName, potential } = input;
  const youth: YouthSeason[] = [];
  const episodes: YouthEpisode[] = [];
  let startMarks: Mark[] = [];
  let startMinutesBonus = 0;
  let overall = 40 + (input.create.age - YOUTH_START_AGE) * 2;
  let age = YOUTH_START_AGE;
  let year = 1;

  const fermo = (pending: EarlyPending): YouthOutcome => ({
    youth, episodes, overall, age, startMarks, startMinutesBonus, pending,
  });

  while (age <= YOUTH_LAST_AGE) {
    if (decisions.promotedAt !== undefined && year > decisions.promotedAt) break;

    const scelta = decisions.youth?.[String(year)];
    if (scelta === undefined) {
      return fermo({ kind: 'youth', year, age, clubName, overall });
    }

    const stagione = playYouthSeason(
      { year, age, clubName, overall, potential, approach: scelta },
      createRng((seed ^ 0x2545f491) + year * 6151),
    );

    /*
     * L'episodio dell'anno. Si decide prima di vedere il resoconto, e il suo effetto
     * entra nella crescita di quell'anno: il ragazzo che esce dal vivaio dev'essere lo
     * stesso che entra in prima squadra, un solo overall e nessun salto (D-023).
     */
    const episodio = pickYouthEvent(
      {
        year, age, clubName,
        overall: stagione.overallEnd,
        role: input.create.role,
        approach: scelta,
        season: stagione,
        usedEventIds: episodes.map((item) => item.eventId),
      },
      createRng((seed ^ 0x27d4eb2f) + year * 40503),
    );
    const rispostaId = decisions.youthEvents?.[String(year)];
    const risposta = episodio?.options.find((option) => option.id === rispostaId);

    /*
     * I salvataggi nati prima degli episodi non hanno la chiave `youthEvents`. Se una
     * di quelle carriere ha già lasciato le giovanili, non le si può chiedere adesso
     * una scelta di allora: quegli anni restano senza episodio e la carriera continua
     * a caricarsi come prima. Una carriera nuova ha sempre la chiave, anche vuota.
     */
    const eredita = decisions.youthEvents === undefined && decisions.promotedAt !== undefined;
    if (episodio !== null && risposta === undefined && !eredita) {
      return fermo({
        kind: 'youth-event',
        year, age, clubName,
        overall: stagione.overallEnd,
        dilemma: episodio,
        season: stagione,
      });
    }

    let overallFine = stagione.overallEnd;
    if (episodio !== null && risposta !== undefined) {
      const esito = resolveYouthOption(risposta, createRng((seed ^ 0x165667b1) + year * 24593));
      const effetti = esito.effects;
      // Il tetto del potenziale vale anche qui, ma un episodio può far scendere.
      overallFine = Math.min(potential, overallFine + (effetti.overall ?? 0));
      startMinutesBonus += effetti.minutesDelta ?? 0;
      if (effetti.addMark) {
        startMarks = addMark(startMarks, effetti.addMark.id, effetti.addMark.intensity, 0);
      }
      episodes.push({
        year, age,
        eventId: episodio.id,
        title: episodio.title,
        text: episodio.text,
        optionId: risposta.id,
        optionLabel: risposta.label,
        outcomeText: esito.text,
        overall: effetti.overall ?? 0,
        minutesDelta: effetti.minutesDelta ?? 0,
        mark: effetti.addMark ?? null,
      });
    }

    youth.push({ ...stagione, overallEnd: overallFine });
    overall = overallFine;
    age += 1;
    year += 1;

    // Dal secondo anno il club chiede se è ora di salire.
    if (age > YOUTH_START_AGE + 1 && decisions.promotedAt === undefined) {
      return fermo({ kind: 'promotion', age, clubName, overall });
    }
  }

  return { youth, episodes, overall, age, startMarks, startMinutesBonus, pending: null };
}

export function playCareer(save: CareerSave, clubs: readonly CandidateClub[]): PlayState {
  const seasons: SeasonRecord[] = [];
  const rivals: (RivalSnapshot | null)[] = [];

  // ── Prima della prima squadra: l'agente e gli anni di vivaio ──────────────
  const early = createRng(save.seed ^ 0x5bf03635);
  const agent = save.decisions.agentId ? agentById(save.decisions.agentId) ?? null : null;
  if (agent === null) {
    return {
      youth: [], episodes: [], agent: null, seasons, rivals,
      pending: { kind: 'agent', options: offerAgents(early) },
      finished: false, result: null,
    };
  }

  const clubDiPartenza =
    clubs.find((entry) => entry.club.id === save.startClubId)?.club.name ?? 'il club';
  const vivaio = runYouth({
    seed: save.seed,
    create: save.create,
    clubName: clubDiPartenza,
    decisions: save.decisions,
    // Il potenziale è quello del giocatore vero, non un numero a parte: il vivaio e
    // la carriera devono parlare dello stesso ragazzo.
    potential: createPlayer(save.create, createRng(save.seed)).potential,
  });
  const { youth, episodes } = vivaio;

  if (vivaio.pending !== null) {
    return {
      youth, episodes, agent, seasons, rivals,
      pending: vivaio.pending, finished: false, result: null,
    };
  }

  try {
    const result = runCareer({
      // Dal vivaio si esce con un'età e un overall: la prima squadra parte da lì.
      create: { ...save.create, age: vivaio.age },
      startOverall: vivaio.overall,
      startMarks: vivaio.startMarks,
      startMinutesBonus: vivaio.startMinutesBonus,
      world: { clubs, startClubId: save.startClubId },
      seed: save.seed,
      style: save.decisions.style,
      agent,
      requestFor: (season) => {
        const kind = save.decisions.requests?.[String(season)];
        return kind === undefined ? undefined : { kind };
      },
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
            objectives: snapshot.objectives,
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

    return { youth, episodes, agent, seasons, rivals, pending: null, finished: true, result };
  } catch (error) {
    if (error instanceof DecisionRequired) {
      return { youth, episodes, agent, seasons, rivals, pending: error.pending, finished: false, result: null };
    }
    throw error;
  }
}
