import type { LeagueBundle, LeagueSummary } from './types.js';

/**
 * L'unico punto di contatto fra il gioco e il database del mondo.
 * Il motore non sa se dietro c'è EA FC 26, un file della community o dati inventati:
 * è questo che rende il database sostituibile (spec §4.2).
 */
export interface WorldSource {
  listLeagues(): Promise<LeagueSummary[]>;
  loadLeague(leagueId: string): Promise<LeagueBundle>;
}
