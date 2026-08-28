import type { Club } from '../world/types';
import { resolveAwards } from './awards';
import type { DilemmaContext } from './dilemmaCatalog';
import {
  applyEffects, pickDilemmas, resolveOption, type DilemmaPolicy, type DilemmaState,
} from './dilemmas';
import { injuryMinutesPenalty, rollInjury } from './injuries';
import { ageMarks, minutesModifier } from './marks';
import { clubStrength, clubStrengthWith, leaguePosition } from './clubStrength';
import { cupRun, resolveTrophies } from './competitions';
import { competitionsOf, continentalTierFor, type ContinentalTier } from './competitionsMap';
import { growPlayer } from './growth';
import type { Agent } from './agent';
import type { AgentRequest } from './agentRequest';
import { generateOffers, type CandidateClub } from './market';
import { resolveMovement, type Movement } from './movement';
import { nationalSeason } from './national';
import { judgeObjectives, type ClubObjectives } from './objectives';
import { playingTimeShare } from './playingTime';
import type { Rng } from './rng';
import { seasonStats } from './stats';
import type { PlayStyle } from './playstyle';
import { trainingEffect, type TrainingAxis } from './training';
import type { CareerPlayer, DilemmaChoice, Mark, SeasonRecord } from './types';
import { marketValue } from './value';

export interface SimulateSeasonInput {
  season: number;
  player: CareerPlayer;
  club: Club;
  league: { id: string; name: string; level: number; clubCount: number };
  /** Forza di tutti i club del campionato, per la classifica. */
  leagueStrengths: readonly number[];
  /** In quale coppa continentale si è qualificata la squadra l'anno prima. */
  continentalTier: ContinentalTier | null;
  /** Il paese del campionato: decide coppe e nazionale. */
  country: string;
  /** Esiste una divisione sopra questa, dove salire? */
  hasHigherDivision?: boolean;
  /** Ed esiste una divisione sotto, in cui cadere? */
  hasLowerDivision?: boolean;
  candidates: readonly CandidateClub[];
  /** Chi rappresenta il giocatore sul mercato. */
  agent?: Agent;
  /** Cosa gli è stato chiesto per questa sessione. */
  request?: AgentRequest;
  alreadyCapped: boolean;
  marks: readonly Mark[];
  contractYearsLeft: number;
  /** Bivi affrontati nelle ultime stagioni: non si ripropongono. */
  recentDilemmaIds: readonly string[];
  /** Minuti guadagnati o persi per effetto delle scelte della stagione precedente. */
  minutesBonus: number;
  dilemmaPolicy: DilemmaPolicy;
  /** Su cosa ha scelto di lavorare quest'anno (spec §3.2). */
  training: TrainingAxis;
  /** Come interpreta il ruolo. */
  style?: PlayStyle;
  /** Cosa il club ha chiesto quest'anno. */
  objectives?: ClubObjectives;
  /**
   * Quanto il club vale in più (o in meno) rispetto alla sua rosa sulla carta: chi è
   * appena salito investe, chi è appena sceso vende. Si consuma in poche stagioni.
   */
  clubBonus?: number;
}

export interface SeasonOutcome {
  record: SeasonRecord;
  grownPlayer: CareerPlayer;
  /** In quale coppa continentale si è qualificata la squadra per l'anno prossimo. */
  qualifiedNextSeason: ContinentalTier | null;
  marks: Mark[];
  retirementDelta: number;
  /** Bonus minuti da applicare alla stagione successiva. */
  minutesBonusNext: number;
}

/** Risolve una stagione intera: campo, classifica, trofei, premi, nazionale, mercato. */
export function simulateSeason(input: SimulateSeasonInput, rng: Rng): SeasonOutcome {
  const { player, club, league } = input;

  const baseShare = playingTimeShare(
    { overall: player.overall, age: player.age, role: player.role },
    club.squad,
  );
  // I Segni e le scelte passate spostano i minuti prima ancora che la stagione cominci.
  const adjustedShare = Math.min(
    0.95,
    Math.max(0.02, baseShare + minutesModifier(input.marks) + input.minutesBonus),
  );

  const training = trainingEffect(input.training);
  const trainedShare = Math.min(0.95, Math.max(0.02, adjustedShare + training.minutesDelta));

  const injury = rollInjury(
    {
      season: input.season,
      age: player.age,
      physique: player.physique,
      minutesShare: trainedShare,
      marks: input.marks,
    },
    rng,
  );
  const minutesShare = Math.max(0.02, trainedShare * (1 - injuryMinutesPenalty(injury)));

  const bonus = input.clubBonus ?? 0;
  const strength = clubStrengthWith(club, player.overall, player.role, minutesShare) + bonus;
  const position = leaguePosition(strength, input.leagueStrengths, rng, clubStrength(club) + bonus);

  const stats = seasonStats(
    {
      overall: player.overall,
      role: player.role,
      minutesShare,
      clubStrength: strength,
      leagueLevel: league.level,
      style: input.style,
      teamPosition: position,
      clubCount: league.clubCount,
    },
    rng,
  );

  const competitions = competitionsOf(input.country);
  const trophies = resolveTrophies(
    {
      season: input.season,
      leagueName: league.name,
      position,
      clubCount: league.clubCount,
      continentalTier: input.continentalTier,
      competitions,
      minutesShare,
    },
    rng,
  );

  const awards = resolveAwards(
    {
      season: input.season,
      leagueName: league.name,
      leagueLevel: league.level,
      age: player.age,
      role: player.role,
      stats,
      position,
    },
    rng,
  );

  const national = nationalSeason(
    {
      season: input.season,
      age: player.age,
      overall: player.overall,
      role: player.role,
      stats,
      leagueLevel: league.level,
      alreadyCapped: input.alreadyCapped,
    },
    rng,
  );

  // I bivi vedono la stagione appena vissuta, infortunio compreso.
  const context: DilemmaContext = {
    season: input.season,
    age: player.age,
    overall: player.overall,
    minutesShare,
    injury,
    marks: input.marks,
    clubName: club.name,
    leagueLevel: league.level,
    contractYearsLeft: input.contractYearsLeft,
    wonSomething: trophies.length > 0,
    recentDilemmaIds: input.recentDilemmaIds,
  };

  let state: DilemmaState = {
    overall: player.overall,
    marks: [...input.marks],
    minutesDelta: 0,
    retirementDelta: 0,
    valueMultiplier: 1,
  };
  const choices: DilemmaChoice[] = [];

  // Il riassunto viaggia col contesto: chi deve chiedere all'utente sa già com'è andata.
  const soFar = {
    clubName: club.name,
    leagueName: league.name,
    position,
    stats,
    injury,
    minutesShare,
  };

  for (const dilemma of pickDilemmas(context, rng)) {
    const option = input.dilemmaPolicy(dilemma, { ...context, soFar });
    const outcome = resolveOption(option, rng);
    state = applyEffects(state, outcome.effects, input.season);
    choices.push({
      dilemmaId: dilemma.id,
      optionId: option.id,
      optionLabel: option.label,
      outcomeText: outcome.text,
      season: input.season,
    });
  }

  if (training.leadershipChance > 0 && rng.chance(training.leadershipChance)) {
    state = applyEffects(state, { addMark: { id: 'leader-riconosciuto', intensity: 0.5 } }, input.season);
  }

  const afterChoices: CareerPlayer = {
    ...player,
    overall: Math.min(99, Math.max(1, state.overall)),
    physique: Math.min(99, player.physique + training.physiqueDelta),
  };
  // Chi salta partite per infortunio continua comunque ad allenarsi: la crescita risente
  // dell'assenza, ma non si azzera come per chi resta fuori per scelta tecnica.
  const growthShare = (minutesShare + trainedShare) / 2;
  const grownPlayer = growPlayer(afterChoices, growthShare * training.growthMultiplier, rng);
  const valueEur = Math.round(
    marketValue(grownPlayer.overall, grownPlayer.age, grownPlayer.potential) *
      state.valueMultiplier,
  );

  const offers = generateOffers(
    {
      player: {
        overall: grownPlayer.overall,
        age: grownPlayer.age,
        potential: grownPlayer.potential,
        role: grownPlayer.role,
      },
      currentClubId: club.id,
      currentMinutesShare: minutesShare,
      stats,
      candidates: input.candidates,
      agent: input.agent,
      request: input.request,
    },
    rng,
  );

  const marks = ageMarks(state.marks);

  const cammino = cupRun(
    position,
    league.clubCount,
    trophies.some((trofeo) => trofeo.kind === 'nationalCup'),
    rng,
  );

  const salto = resolveMovement(
    {
      position,
      clubCount: league.clubCount,
      leagueLevel: league.level,
      hasHigher: input.hasHigherDivision ?? false,
      hasLower: input.hasLowerDivision ?? false,
    },
    rng,
  );

  return {
    record: {
      season: input.season,
      age: player.age,
      clubId: club.id,
      clubName: club.name,
      leagueId: league.id,
      leagueName: league.name,
      leagueLevel: league.level,
      minutesShare,
      overallStart: player.overall,
      overallEnd: grownPlayer.overall,
      stats,
      position,
      trophies,
      awards,
      national,
      valueEur,
      offers,
      injury,
      choices,
      marks,
      movement: salto.movement,
      playoffPlayed: salto.viaPlayoff,
      cupRound: cammino,
      objectives: input.objectives,
      objectivesMet:
        input.objectives === undefined
          ? undefined
          : judgeObjectives(input.objectives, {
              position, cupRound: cammino, minutesShare, stats,
              capped: national.capped,
            }),
    },
    grownPlayer,
    qualifiedNextSeason: continentalTierFor(position, competitions),
    marks,
    retirementDelta: state.retirementDelta,
    minutesBonusNext: state.minutesDelta,
  };
}
