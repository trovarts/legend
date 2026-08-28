import type { Club } from '../world/types.js';
import { resolveAwards } from './awards.js';
import type { DilemmaContext } from './dilemmaCatalog.js';
import {
  applyEffects, pickDilemmas, resolveOption, type DilemmaPolicy, type DilemmaState,
} from './dilemmas.js';
import { injuryMinutesPenalty, rollInjury } from './injuries.js';
import { ageMarks, minutesModifier } from './marks.js';
import { clubStrengthWith, leaguePosition } from './clubStrength.js';
import { resolveTrophies } from './competitions.js';
import { growPlayer } from './growth.js';
import { generateOffers, type CandidateClub } from './market.js';
import { nationalSeason } from './national.js';
import { playingTimeShare } from './playingTime.js';
import type { Rng } from './rng.js';
import { seasonStats } from './stats.js';
import type { CareerPlayer, DilemmaChoice, Mark, SeasonRecord } from './types.js';
import { marketValue } from './value.js';

export interface SimulateSeasonInput {
  season: number;
  player: CareerPlayer;
  club: Club;
  league: { id: string; name: string; level: number; clubCount: number };
  /** Forza di tutti i club del campionato, per la classifica. */
  leagueStrengths: readonly number[];
  qualifiedToContinental: boolean;
  candidates: readonly CandidateClub[];
  alreadyCapped: boolean;
  marks: readonly Mark[];
  contractYearsLeft: number;
  /** Minuti guadagnati o persi per effetto delle scelte della stagione precedente. */
  minutesBonus: number;
  dilemmaPolicy: DilemmaPolicy;
}

export interface SeasonOutcome {
  record: SeasonRecord;
  grownPlayer: CareerPlayer;
  /** I primi quattro giocano la coppa continentale l'anno dopo. */
  qualifiedNextSeason: boolean;
  marks: Mark[];
  retirementDelta: number;
  /** Bonus minuti da applicare alla stagione successiva. */
  minutesBonusNext: number;
}

const CONTINENTAL_SPOTS = 4;

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

  const injury = rollInjury(
    {
      season: input.season,
      age: player.age,
      physique: player.physique,
      minutesShare: adjustedShare,
      marks: input.marks,
    },
    rng,
  );
  const minutesShare = Math.max(0.02, adjustedShare * (1 - injuryMinutesPenalty(injury)));

  const strength = clubStrengthWith(club, player.overall, player.role, minutesShare);
  const position = leaguePosition(strength, input.leagueStrengths, rng);

  const stats = seasonStats(
    {
      overall: player.overall,
      role: player.role,
      minutesShare,
      clubStrength: strength,
      leagueLevel: league.level,
    },
    rng,
  );

  const trophies = resolveTrophies(
    {
      season: input.season,
      leagueName: league.name,
      position,
      clubCount: league.clubCount,
      qualifiedToContinental: input.qualifiedToContinental,
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
  };

  let state: DilemmaState = {
    overall: player.overall,
    marks: [...input.marks],
    minutesDelta: 0,
    retirementDelta: 0,
    valueMultiplier: 1,
  };
  const choices: DilemmaChoice[] = [];

  for (const dilemma of pickDilemmas(context, rng)) {
    const option = input.dilemmaPolicy(dilemma, context);
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

  const afterChoices: CareerPlayer = {
    ...player,
    overall: Math.min(99, Math.max(1, state.overall)),
  };
  // Chi salta partite per infortunio continua comunque ad allenarsi: la crescita risente
  // dell'assenza, ma non si azzera come per chi resta fuori per scelta tecnica.
  const growthShare = (minutesShare + adjustedShare) / 2;
  const grownPlayer = growPlayer(afterChoices, growthShare, rng);
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
    },
    rng,
  );

  const marks = ageMarks(state.marks);

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
    },
    grownPlayer,
    qualifiedNextSeason: position <= CONTINENTAL_SPOTS,
    marks,
    retirementDelta: state.retirementDelta,
    minutesBonusNext: state.minutesDelta,
  };
}
