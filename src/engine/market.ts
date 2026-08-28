import type { Agent } from './agent';
import type { AgentRequest } from './agentRequest';
import { requestEffect } from './agentRequest';
import type { Club, Role } from '../world/types';
import { clubStrength } from './clubStrength';
import { playingTimeShare } from './playingTime';
import type { Rng } from './rng';
import type { Offer, SeasonStats } from './types';
import { marketValue, weeklyWage } from './value';

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
  /** Chi ti rappresenta: decide quante porte si aprono e quanto in alto. */
  agent?: Agent;
  /** Cosa gli hai chiesto di cercare, se glielo hai chiesto. */
  request?: AgentRequest;
}

const MAX_OFFERS = 4;

/** Sotto questa quota di minuti un giovane è considerato bloccato e va mandato a giocare. */
const STUCK_SHARE = 0.25;
const LOAN_AGE = 23;
/**
 * Quanti minuti in più deve promettere un prestito per avere senso.
 * Non una soglia assoluta: nel calcio vero un diciassettenne non gioca titolare da
 * nessuna parte, ma passare dall'8% al 22% è comunque triplicare il campo.
 */
const LOAN_MINUTES_GAIN = 0.1;

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
  const spinta = input.agent ? requestEffect(input.request, input.agent) : null;
  const tetto = input.agent?.ceilingOverall ?? 99;
  const reputazione = input.agent?.reputation ?? 0;

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
    const wantsLoan =
      isStuck && expectedMinutesShare > input.currentMinutesShare + LOAN_MINUTES_GAIN;

    if (!fitsSquad && !isProspect && !wantsLoan) continue;

    // I club forti non prendono giocatori in là con gli anni che non li migliorano.
    if (input.player.age >= 33 && input.player.overall < strength) continue;

    // Il divario di forza pesa solo su un acquisto vero: chi ti prende in prestito
    // lo fa proprio perché sei un giovane da far crescere.
    const strengthPenalty = wantsLoan ? 0 : Math.max(0, (strength - input.player.overall) * 0.04);
    // L'agente non arriva ovunque: sopra il suo tetto le porte restano chiuse.
    if (strength > tetto + 4) continue;

    const orientamento = spinta === null
      ? 0
      : spinta.minutesBias * (expectedMinutesShare - 0.5) +
        spinta.strengthBias * ((strength - 70) / 20) +
        spinta.wageBias * ((strength - 70) / 25);

    const interest =
      0.25 + score + reputazione + orientamento +
      (isProspect ? 0.25 : 0) + (wantsLoan ? 0.5 : 0) - strengthPenalty;

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

  const quante = Math.min(
    MAX_OFFERS + (spinta?.extraOffers ?? 0),
    input.agent?.maxOffers ?? MAX_OFFERS,
  );
  return offers.sort((a, b) => b.feeEur - a.feeEur).slice(0, Math.max(1, quante));
}

export interface TransferContext {
  currentMinutesShare: number;
  currentLeagueLevel: number;
  age: number;
  /** Serve a chi indicizza le decisioni per stagione (il replay della Fase 4). */
  season: number;
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
  // Chi non gioca accetta il prestito che gli dà più campo: scendere di categoria
  // per un anno vale molto più che restare in tribuna in una big.
  if (context.currentMinutesShare < STUCK_SHARE) {
    const loans = offers.filter(
      (offer) => offer.isLoan && offer.expectedMinutesShare > context.currentMinutesShare + LOAN_MINUTES_GAIN,
    );
    if (loans.length > 0) {
      return loans.reduce((best, offer) =>
        offer.expectedMinutesShare > best.expectedMinutesShare ? offer : best,
      );
    }
  }

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
