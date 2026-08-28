import type { Role } from '../world/types';
import { clubStrength } from './clubStrength';
import { signContract, tickContract, type Contract } from './contract';
import { createPlayer } from './create';
import { boldPolicy } from './dilemmas';
import { ambitiousPolicy, type CandidateClub } from './market';
import { createRng, type Rng } from './rng';
import { simulateSeason } from './season';
import type { CareerPlayer, RivalSnapshot, SeasonRecord, Showdown } from './types';

/** Nomi del Rivale: sono di fantasia, non appartengono a nessun calciatore reale. */
const RIVAL_NAMES: readonly string[] = [
  'Matteo Rinaldi', 'Luca Sartori', 'Andrea Bellini', 'Marco Fanti', 'Davide Corsi',
  'Samuel Adeyemi', 'Tomás Ferreira', 'Nikola Ivic', 'Youssef Haddad', 'Lucas Moreau',
];

export interface RivalState {
  name: string;
  player: CareerPlayer;
  club: CandidateClub;
  seasons: SeasonRecord[];
  qualified: boolean;
  capped: boolean;
  contract: Contract;
}

export interface CreateRivalInput {
  playerRole: Role;
  playerAge: number;
  playerLeagueId: string;
  clubs: readonly CandidateClub[];
  seed: number;
}

/**
 * Il Rivale ha un suo generatore casuale: così le sue vicende non consumano la sequenza
 * del giocatore, e la stessa carriera resta identica anche se un giorno il Rivale cambierà.
 */
export function rivalSeed(careerSeed: number): number {
  return (careerSeed ^ 0x9e3779b9) >>> 0;
}

export function createRival(input: CreateRivalInput): RivalState {
  const rng = createRng(rivalSeed(input.seed));

  // In un campionato diverso dal tuo: il confronto vale di più se non vi incrociate ogni domenica.
  const elsewhere = input.clubs.filter((entry) => entry.leagueId !== input.playerLeagueId);
  const pool = elsewhere.length > 0 ? elsewhere : input.clubs;
  const club = pool[rng.int(0, pool.length - 1)]!;

  const player = createPlayer(
    {
      name: RIVAL_NAMES[rng.int(0, RIVAL_NAMES.length - 1)]!,
      nationality: 'Italy',
      role: input.playerRole,
      age: input.playerAge,
      leagueLevel: club.leagueLevel,
    },
    rng,
  );

  return {
    name: player.name,
    player,
    club,
    seasons: [],
    qualified: false,
    capped: false,
    contract: signContract(0, input.playerAge, rng),
  };
}

/** Una stagione del Rivale, con le stesse regole del giocatore ma senza scelte umane. */
export function advanceRival(
  state: RivalState,
  clubs: readonly CandidateClub[],
  season: number,
  careerSeed: number,
): RivalState {
  const rng = createRng(rivalSeed(careerSeed) + season * 7919);

  const sameLeague = clubs.filter((entry) => entry.leagueId === state.club.leagueId);
  const leagueStrengths = (sameLeague.length > 0 ? sameLeague : clubs).map((entry) =>
    clubStrength(entry.club),
  );

  const others = clubs.filter((entry) => entry.club.id !== state.club.club.id);
  const candidates: CandidateClub[] = [];
  for (let i = 0; i < Math.min(8, others.length); i += 1) {
    const picked = others[rng.int(0, others.length - 1)];
    if (picked && !candidates.includes(picked)) candidates.push(picked);
  }

  const outcome = simulateSeason(
    {
      season,
      player: state.player,
      club: state.club.club,
      league: {
        id: state.club.leagueId,
        name: state.club.leagueName,
        level: state.club.leagueLevel,
        clubCount: leagueStrengths.length,
      },
      leagueStrengths,
      qualifiedToContinental: state.qualified,
      candidates,
      alreadyCapped: state.capped,
      marks: [],
      contractYearsLeft: state.contract.yearsLeft,
      recentDilemmaIds: [],
      minutesBonus: 0,
      dilemmaPolicy: boldPolicy,
      // Il Rivale si allena da solo: tecnica finché è giovane, fisico quando invecchia.
      training: state.player.age >= 30 ? 'fisico' : 'tecnica',
      style: 'equilibrato',
    },
    rng,
  );

  let club = state.club;
  let contract = tickContract(state.contract);
  if (contract.yearsLeft <= 1) {
    const chosen = ambitiousPolicy(outcome.record.offers, {
      currentMinutesShare: outcome.record.minutesShare,
      currentLeagueLevel: state.club.leagueLevel,
      age: outcome.grownPlayer.age,
      season,
    });
    const destination = chosen ? clubs.find((entry) => entry.club.id === chosen.clubId) : undefined;
    if (destination) {
      club = destination;
      contract = signContract(season, outcome.grownPlayer.age, rng);
    }
  }

  return {
    ...state,
    player: outcome.grownPlayer,
    club,
    contract,
    seasons: [...state.seasons, outcome.record],
    qualified: outcome.qualifiedNextSeason,
    capped: state.capped || outcome.record.national.capped,
  };
}

/** Il metro con cui si misurano due stagioni: vale per tutti i ruoli. */
export function seasonScoreOf(season: SeasonRecord): number {
  const stats = season.stats;
  const production = stats.goals * 2 + stats.assists + stats.cleanSheets * 1.5;
  const quality = (stats.rating - 6) * 8;
  const silverware = season.trophies.length * 12 + season.awards.length * 18;
  return production + quality + silverware + stats.appearances * 0.2;
}

export function compareSeason(
  playerSeason: SeasonRecord,
  rivalSeason: SeasonRecord | undefined,
  rivalName: string,
  rivalClubName: string,
): RivalSnapshot | null {
  if (!rivalSeason) return null;
  return {
    name: rivalName,
    clubName: rivalClubName,
    overall: rivalSeason.overallEnd,
    goals: rivalSeason.stats.goals,
    assists: rivalSeason.stats.assists,
    trophies: rivalSeason.trophies.length,
    aheadOfYou: seasonScoreOf(rivalSeason) > seasonScoreOf(playerSeason),
  };
}

const SHOWDOWN_POSITION = 4;

/**
 * Quando entrambi arrivano in alto, prima o poi vi incrociate in coppa.
 * Quelle partite pesano il doppio nel punteggio finale (spec §3.4).
 */
export function rollShowdown(
  playerSeason: SeasonRecord,
  rivalSeason: SeasonRecord | undefined,
  rng: Rng,
): Showdown | null {
  if (!rivalSeason) return null;
  if (playerSeason.position > SHOWDOWN_POSITION || rivalSeason.position > SHOWDOWN_POSITION) {
    return null;
  }
  if (!rng.chance(0.45)) return null;

  const mine = seasonScoreOf(playerSeason);
  const his = seasonScoreOf(rivalSeason);
  const edge = (mine - his) / Math.max(20, mine + his);
  return {
    season: playerSeason.season,
    competition: 'Coppa Continentale',
    won: rng.chance(Math.min(0.85, Math.max(0.15, 0.5 + edge))),
  };
}
