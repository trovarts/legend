import type { Club } from '../world/types.js';
import { createPlayer, type CreatePlayerInput } from './create.js';
import { growPlayer } from './growth.js';
import { playingTimeShare } from './playingTime.js';
import { shouldRetire } from './retirement.js';
import { createRng } from './rng.js';
import type { CareerResult, SeasonRecord } from './types.js';

export interface RunCareerInput {
  create: CreatePlayerInput;
  club: Club;
  leagueId: string;
  seed: number;
}

/** Limite di sicurezza: nessuna carriera può girare all'infinito. */
const MAX_SEASONS = 30;

/**
 * Una carriera intera, dalla creazione al ritiro.
 * In Fase 1 il club non cambia mai: mercato e trasferimenti arrivano in Fase 2.
 */
export function runCareer(input: RunCareerInput): CareerResult {
  const rng = createRng(input.seed);
  let player = createPlayer(input.create, rng);
  const seasons: SeasonRecord[] = [];

  while (!player.retired && seasons.length < MAX_SEASONS) {
    const minutesShare = playingTimeShare(player.overall, player.role, input.club.squad);
    const overallStart = player.overall;
    const age = player.age;

    player = growPlayer(player, minutesShare, rng);

    seasons.push({
      season: seasons.length + 1,
      age,
      clubId: input.club.id,
      clubName: input.club.name,
      leagueId: input.leagueId,
      minutesShare,
      overallStart,
      overallEnd: player.overall,
    });

    if (shouldRetire(player, minutesShare, rng)) {
      player = { ...player, retired: true };
    }
  }

  if (!player.retired) player = { ...player, retired: true };

  return {
    player,
    seasons,
    peakOverall: seasons.reduce((peak, season) => Math.max(peak, season.overallEnd), 0),
    retiredAt: player.age,
  };
}
