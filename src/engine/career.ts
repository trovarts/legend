import { clubStrength } from './clubStrength';
import { canLeave, signContract, tickContract } from './contract';
import { createPlayer, type CreatePlayerInput } from './create';
import { boldPolicy, type DilemmaPolicy } from './dilemmas';
import type { TrainingAxis } from './training';
import { computeGoatScore } from './goatScore';
import { ambitiousPolicy, type CandidateClub, type TransferPolicy } from './market';
import { advanceRival, compareSeason, createRival, rollShowdown } from './rival';
import { shouldRetire } from './retirement';
import { createRng } from './rng';
import { simulateSeason } from './season';
import type {
  Award, CareerResult, Dilemma, DilemmaChoice, Injury, Mark, Offer, RivalSnapshot, SeasonRecord,
  SeasonStats, Showdown, Trophy,
} from './types';

/** Cosa il motore sta aspettando dall'utente. */
/** Com'è andata la stagione fino al momento della decisione: senza, l'utente sceglie al buio. */
export interface SeasonSoFar {
  clubName: string;
  leagueName: string;
  position: number;
  stats: SeasonStats;
  injury: Injury | null;
  minutesShare: number;
}

export type PendingDecision =
  | { kind: 'training'; season: number; age: number; overall: number; clubName: string }
  | { kind: 'dilemma'; season: number; dilemma: Dilemma; soFar: SeasonSoFar }
  | { kind: 'transfer'; season: number; offers: Offer[] };

/**
 * Lanciata dalle politiche quando la decisione non è ancora stata presa.
 * Interrompe la carriera in un punto ben definito, senza stato mutabile di mezzo.
 */
export class DecisionRequired extends Error {
  constructor(readonly pending: PendingDecision) {
    super(`decisione richiesta: ${pending.kind}`);
    this.name = 'DecisionRequired';
  }
}

export interface CareerWorld {
  clubs: readonly CandidateClub[];
  startClubId: string;
}

export interface RunCareerInput {
  create: CreatePlayerInput;
  world: CareerWorld;
  seed: number;
  policy?: TransferPolicy;
  /** In Fase 4 sarà l'utente a scegliere ai bivi. */
  dilemmaPolicy?: DilemmaPolicy;
  /** Su cosa lavora in preparazione; in Fase 4 lo sceglie l'utente. */
  trainingPolicy?: (season: number, snapshot: { age: number; overall: number; clubName: string }) => TrainingAxis;
  /**
   * Chiamata a ogni stagione conclusa: raccoglie lo stato anche se poi si sospende.
   * Porta con sé il Rivale, che altrimenti si vedrebbe solo alla fine della carriera.
   */
  onSeason?: (record: SeasonRecord, rival: RivalSnapshot | null) => void;
}

const MAX_SEASONS = 30;
/** Quanti club valuta il mercato ogni anno: tutti sarebbe inutilmente costoso. */
const CANDIDATE_SAMPLE = 12;

export function runCareer(input: RunCareerInput): CareerResult {
  const rng = createRng(input.seed);
  const policy = input.policy ?? ambitiousPolicy;
  const dilemmaPolicy = input.dilemmaPolicy ?? boldPolicy;

  let current = input.world.clubs.find((entry) => entry.club.id === input.world.startClubId);
  if (!current) throw new Error(`club di partenza non trovato: ${input.world.startClubId}`);

  const startingLeagueLevel = current.leagueLevel;
  let player = createPlayer(input.create, rng);
  let contract = signContract(0, player.age, rng);

  let rival = createRival({
    playerRole: player.role,
    playerAge: player.age,
    playerLeagueId: current.leagueId,
    clubs: input.world.clubs,
    seed: input.seed,
  });

  const seasons: SeasonRecord[] = [];
  const clubsPlayed: string[] = [current.club.name];
  const showdowns: Showdown[] = [];
  let marks: Mark[] = [];
  let minutesBonus = 0;
  let retirementDelta = 0;
  let qualified = false;
  let capped = false;
  let seasonsAheadOfRival = 0;
  /** Per quante stagioni un bivio resta "già visto". */
  const DILEMMA_COOLDOWN = 4;
  let recentDilemmaIds: string[] = [];

  const strengthsByLeague = new Map<string, number[]>();
  for (const entry of input.world.clubs) {
    const list = strengthsByLeague.get(entry.leagueId) ?? [];
    list.push(clubStrength(entry.club));
    strengthsByLeague.set(entry.leagueId, list);
  }

  while (!player.retired && seasons.length < MAX_SEASONS) {
    const club = current;
    const season = seasons.length + 1;
    const leagueStrengths = strengthsByLeague.get(club.leagueId) ?? [clubStrength(club.club)];

    const others = input.world.clubs.filter((entry) => entry.club.id !== club.club.id);
    const candidates: CandidateClub[] = [];
    for (let i = 0; i < Math.min(CANDIDATE_SAMPLE, others.length); i += 1) {
      const picked = others[rng.int(0, others.length - 1)];
      if (picked && !candidates.includes(picked)) candidates.push(picked);
    }

    const outcome = simulateSeason(
      {
        season,
        player,
        club: club.club,
        league: {
          id: club.leagueId, name: club.leagueName,
          level: club.leagueLevel, clubCount: leagueStrengths.length,
        },
        leagueStrengths,
        qualifiedToContinental: qualified,
        candidates,
        alreadyCapped: capped,
        marks,
        contractYearsLeft: contract.yearsLeft,
        recentDilemmaIds,
        minutesBonus,
        dilemmaPolicy,
        training: (input.trainingPolicy ?? (() => 'tecnica' as const))(season, {
          age: player.age, overall: player.overall, clubName: club.club.name,
        }),
      },
      rng,
    );

    // Il Rivale vive la sua stagione con il proprio generatore casuale.
    rival = advanceRival(rival, input.world.clubs, season, input.seed);
    const rivalSeason = rival.seasons[rival.seasons.length - 1];
    const snapshot = compareSeason(outcome.record, rivalSeason, rival.name, rival.club.club.name);
    if (snapshot && !snapshot.aheadOfYou) seasonsAheadOfRival += 1;
    const showdown = rollShowdown(outcome.record, rivalSeason, rng);
    if (showdown) showdowns.push(showdown);
    input.onSeason?.(outcome.record, snapshot);

    seasons.push(outcome.record);
    qualified = outcome.qualifiedNextSeason;
    capped = capped || outcome.record.national.capped;
    marks = outcome.marks;
    recentDilemmaIds = [
      ...outcome.record.choices.map((choice) => choice.dilemmaId),
      ...recentDilemmaIds,
    ].slice(0, DILEMMA_COOLDOWN * 2);
    minutesBonus = outcome.minutesBonusNext;
    retirementDelta += outcome.retirementDelta;
    player = outcome.grownPlayer;
    contract = tickContract(contract);

    // Gli anni bruciati dalle scelte accorciano la carriera.
    const forcedRetirement = retirementDelta < 0 && player.age >= 34 + retirementDelta;
    if (forcedRetirement || shouldRetire(player, outcome.record.minutesShare, rng)) {
      player = { ...player, retired: true };
      break;
    }

    if (canLeave(contract)) {
      const chosen = policy(outcome.record.offers, {
        currentMinutesShare: outcome.record.minutesShare,
        currentLeagueLevel: club.leagueLevel,
        age: player.age,
        season,
      });
      if (chosen) {
        const destination = input.world.clubs.find((entry) => entry.club.id === chosen.clubId);
        if (destination) {
          current = destination;
          contract = signContract(season, player.age, rng);
          if (clubsPlayed[clubsPlayed.length - 1] !== destination.club.name) {
            clubsPlayed.push(destination.club.name);
          }
        }
      }
    }
  }

  if (!player.retired) player = { ...player, retired: true };

  const trophies: Trophy[] = seasons.flatMap((season) => season.trophies);
  const awards: Award[] = seasons.flatMap((season) => season.awards);
  const choices: DilemmaChoice[] = seasons.flatMap((season) => season.choices);
  const injuries: Injury[] = seasons
    .map((season) => season.injury)
    .filter((injury): injury is Injury => injury !== null);

  const peakOverall = seasons.reduce((peak, season) => Math.max(peak, season.overallEnd), 0);
  const peakValueEur = seasons.reduce((peak, season) => Math.max(peak, season.valueEur), 0);
  const totalCaps = seasons.reduce((sum, season) => sum + season.national.caps, 0);

  const goat = computeGoatScore({
    role: player.role, seasons, trophies, awards, peakOverall, peakValueEur,
    totalCaps, startingLeagueLevel, showdowns, seasonsAheadOfRival,
  });

  return {
    player,
    seasons,
    peakOverall,
    retiredAt: player.age,
    clubsPlayed,
    trophies,
    awards,
    peakValueEur,
    totalCaps,
    goat,
    rival: {
      name: rival.name,
      clubName: rival.club.club.name,
      peakOverall: rival.seasons.reduce((peak, season) => Math.max(peak, season.overallEnd), 0),
      trophies: rival.seasons.reduce((sum, season) => sum + season.trophies.length, 0),
      goals: rival.seasons.reduce((sum, season) => sum + season.stats.goals, 0),
    },
    showdowns,
    choices,
    marks,
    injuries,
    seasonsAheadOfRival,
    careerYearsBurned: retirementDelta,
  };
}
