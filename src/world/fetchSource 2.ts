import type { WorldSource } from './source';
import type { LeagueBundle, LeagueSummary } from './types';

/**
 * La stessa interfaccia della sorgente da filesystem, ma per il browser.
 * Ogni campionato pesa una cinquantina di kilobyte e si scarica solo quando serve:
 * è la risposta ai 3,2 MB in un file solo del concorrente (spec §2).
 */
export function createFetchWorldSource(baseUrl: string, fetchImpl: typeof fetch = fetch): WorldSource {
  let indexCache: LeagueSummary[] | undefined;
  const leagueCache = new Map<string, LeagueBundle>();

  return {
    async listLeagues(): Promise<LeagueSummary[]> {
      if (!indexCache) {
        const response = await fetchImpl(`${baseUrl}/index.json`);
        if (!response.ok) throw new Error('indice dei campionati non raggiungibile');
        indexCache = (await response.json()) as LeagueSummary[];
      }
      return indexCache;
    },

    async loadLeague(leagueId: string): Promise<LeagueBundle> {
      const cached = leagueCache.get(leagueId);
      if (cached) return cached;
      const response = await fetchImpl(`${baseUrl}/leagues/${leagueId}.json`);
      if (!response.ok) throw new Error(`campionato non trovato: ${leagueId}`);
      const bundle = (await response.json()) as LeagueBundle;
      leagueCache.set(leagueId, bundle);
      return bundle;
    },
  };
}
