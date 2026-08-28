import { clubStrength } from './clubStrength.js';
import { createPlayer, type CreatePlayerInput } from './create.js';
import { ambitiousPolicy, type CandidateClub, type TransferPolicy } from './market.js';
import { shouldRetire } from './retirement.js';
import { createRng } from './rng.js';
import { simulateSeason } from './season.js';
import type { Award, CareerResult, SeasonRecord, Trophy } from './types.js';

export interface CareerWorld {
  clubs: readonly CandidateClub[];
  startClubId: string;
}

export interface RunCareerInput {
  create: CreatePlayerInput;
  world: CareerWorld;
  seed: number;
  /** In Fase 4 sarà la scelta dell'utente. */
  policy?: TransferPolicy;
}

const MAX_SEASONS = 30;
/** Quanti club valuta il mercato ogni anno: tutti sarebbe inutilmente costoso. */
const CANDIDATE_SAMPLE = 12;

export function runCareer(input: RunCareerInput): CareerResult {
  const rng = createRng(input.seed);
  const policy = input.policy ?? ambitiousPolicy;

  let current = input.world.clubs.find((entry) => entry.club.id === input.world.startClubId);
  if (!current) throw new Error(`club di partenza non trovato: ${input.world.startClubId}`);

  let player = createPlayer(input.create, rng);
  const seasons: SeasonRecord[] = [];
  const clubsPlayed: string[] = [current.club.name];
  let qualified = false;
  let capped = false;

  // Le forze dei club per campionato non cambiano durante la carriera: si calcolano una volta.
  const strengthsByLeague = new Map<string, number[]>();
  for (const entry of input.world.clubs) {
    const list = strengthsByLeague.get(entry.leagueId) ?? [];
    list.push(clubStrength(entry.club));
    strengthsByLeague.set(entry.leagueId, list);
  }

  while (!player.retired && seasons.length < MAX_SEASONS) {
    const club = current;
    const leagueStrengths = strengthsByLeague.get(club.leagueId) ?? [clubStrength(club.club)];

    // Un campione di club diversi dal proprio, stabile a parità di seed.
    const others = input.world.clubs.filter((entry) => entry.club.id !== club.club.id);
    const candidates: CandidateClub[] = [];
    for (let i = 0; i < Math.min(CANDIDATE_SAMPLE, others.length); i += 1) {
      const picked = others[rng.int(0, others.length - 1)];
      if (picked && !candidates.includes(picked)) candidates.push(picked);
    }

    const outcome = simulateSeason(
      {
        season: seasons.length + 1,
        player,
        club: club.club,
        league: {
          id: club.leagueId,
          name: club.leagueName,
          level: club.leagueLevel,
          clubCount: leagueStrengths.length,
        },
        leagueStrengths,
        qualifiedToContinental: qualified,
        candidates,
        alreadyCapped: capped,
      },
      rng,
    );

    seasons.push(outcome.record);
    qualified = outcome.qualifiedNextSeason;
    capped = capped || outcome.record.national.capped;
    player = outcome.grownPlayer;

    if (shouldRetire(player, outcome.record.minutesShare, rng)) {
      player = { ...player, retired: true };
      break;
    }

    const chosen = policy(outcome.record.offers, {
      currentMinutesShare: outcome.record.minutesShare,
      currentLeagueLevel: club.leagueLevel,
      age: player.age,
    });

    if (chosen) {
      const destination = input.world.clubs.find((entry) => entry.club.id === chosen.clubId);
      if (destination) {
        current = destination;
        if (clubsPlayed[clubsPlayed.length - 1] !== destination.club.name) {
          clubsPlayed.push(destination.club.name);
        }
      }
    }
  }

  if (!player.retired) player = { ...player, retired: true };

  const trophies: Trophy[] = seasons.flatMap((season) => season.trophies);
  const awards: Award[] = seasons.flatMap((season) => season.awards);

  return {
    player,
    seasons,
    peakOverall: seasons.reduce((peak, season) => Math.max(peak, season.overallEnd), 0),
    retiredAt: player.age,
    clubsPlayed,
    trophies,
    awards,
    peakValueEur: seasons.reduce((peak, season) => Math.max(peak, season.valueEur), 0),
    totalCaps: seasons.reduce((sum, season) => sum + season.national.caps, 0),
  };
}
