import type { Club, Role } from '../world/types.js';
import { clubStrength } from './clubStrength.js';
import { playingTimeShare } from './playingTime.js';
import type { Rng } from './rng.js';
import type { Offer, SeasonStats } from './types.js';
import { marketValue, weeklyWage } from './value.js';

export interface CandidateClub {
  club: Club;
  leagueId: string;
  leagueName: string;
  leagueLevel: number;
}

export interface OffersInput {
  player: { overall: number; age: number; potential: number; role: Role };
  currentClubId: string;
  currentMinutesShare: number;
  stats: SeasonStats;
  candidates: readonly CandidateClub[];
}

const MAX_OFFERS = 4;
/** Sotto questa quota di minuti un giovane è considerato bloccato e va mandato a giocare. */
const STUCK_SHARE = 0.25;
const LOAN_AGE = 23;

/** Quanto una stagione è piaciuta: usata per alzare o abbassare l'interesse. */
function seasonScore(stats: SeasonStats, role: Role): number {
  if (stats.appearances < 5) return -0.3;
  const production = role === 'GK'
    ? stats.cleanSheets / Math.max(1, stats.appearances)
    : (stats.goals + stats.assists) / Math.max(1, stats.appearances);
  return (stats.rating - 6.8) * 0.5 + production * 0.6;
}

export function generateOffers(input: OffersInput, rng: Rng): Offer[] {
  const value = marketValue(input.player.overall, input.player.age, input.player.potential);
  const score = seasonScore(input.stats, input.player.role);
  const isStuck = input.player.age <= LOAN_AGE && input.currentMinutesShare < STUCK_SHARE;

  const offers: Offer[] = [];

  for (const candidate of input.candidates) {
    if (candidate.club.id === input.currentClubId) continue;

    const strength = clubStrength(candidate.club);
    const expectedMinutesShare = playingTimeShare(
      { overall: input.player.overall, age: input.player.age, role: input.player.role },
      candidate.club.squad,
    );

    // Un club guarda un giocatore se lo migliora o se ha il fisico per il futuro.
    const fitsSquad = input.player.overall >= strength - 6;
    const isProspect = input.player.age <= 23 && input.player.potential >= strength + 2;
    const wantsLoan = isStuck && expectedMinutesShare > 0.45;

    if (!fitsSquad && !isProspect && !wantsLoan) continue;

    // I club forti non prendono giocatori in là con gli anni che non li migliorano.
    if (input.player.age >= 33 && input.player.overall < strength) continue;

    const interest =
      0.25 + score + (isProspect ? 0.25 : 0) + (wantsLoan ? 0.5 : 0)
      - Math.max(0, (strength - input.player.overall) * 0.04);

    if (!rng.chance(Math.min(0.9, interest))) continue;

    // Il prestito è il modo in cui un giovane che non gioca torna a giocare: non dipende
    // da quanto è adatto alla destinazione, ma dal fatto che lì avrebbe spazio.
    const isLoan = wantsLoan;
    offers.push({
      clubId: candidate.club.id,
      clubName: candidate.club.name,
      leagueId: candidate.leagueId,
      leagueName: candidate.leagueName,
      leagueLevel: candidate.leagueLevel,
      feeEur: isLoan ? 0 : Math.round((value * (0.85 + rng.next() * 0.5)) / 10_000) * 10_000,
      weeklyWageEur: Math.round(weeklyWage(value) * (isLoan ? 1 : 1 + rng.next() * 0.4)),
      expectedMinutesShare,
      isLoan,
    });
  }

  return offers.sort((a, b) => b.feeEur - a.feeEur).slice(0, MAX_OFFERS);
}

export interface TransferContext {
  currentMinutesShare: number;
  currentLeagueLevel: number;
  age: number;
}

/**
 * Come sceglie il giocatore quando nessuno clicca: in Fase 4 questa funzione
 * viene sostituita dalla decisione dell'utente.
 */
export type TransferPolicy = (
  offers: readonly Offer[],
  context: TransferContext,
) => Offer | null;

/** Il punteggio che il Lab usa per decidere: prima i minuti, poi l'ambizione. */
function offerScore(offer: Offer, context: TransferContext): number {
  const minutesGain = offer.expectedMinutesShare - context.currentMinutesShare;
  const levelGain = context.currentLeagueLevel - offer.leagueLevel;
  const prestige = Math.log10(Math.max(1, offer.feeEur)) / 10;
  return minutesGain * 2 + levelGain * 0.35 + prestige;
}

/** Politica predefinita: giocare conta più di tutto, ma senza buttare via la carriera. */
export const ambitiousPolicy: TransferPolicy = (offers, context) => {
  const acceptable = offers.filter((offer) => {
    // Mai finire in panchina di proposito.
    if (offer.expectedMinutesShare < 0.3 && offer.expectedMinutesShare <= context.currentMinutesShare) {
      return false;
    }
    // Si scende di categoria solo se serve davvero a giocare.
    if (offer.leagueLevel > context.currentLeagueLevel && context.currentMinutesShare >= 0.5) {
      return false;
    }
    return true;
  });

  if (acceptable.length === 0) return null;

  const best = acceptable.reduce((champion, offer) =>
    offerScore(offer, context) > offerScore(champion, context) ? offer : champion,
  );

  return offerScore(best, context) > 0.55 ? best : null;
};
