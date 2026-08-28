import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WorldSource } from './source';
import type { LeagueBundle, LeagueSummary } from './types';

/** Sorgente da filesystem: serve ai test e al Simulation Lab. Nel browser userà fetch. */
export function createFileWorldSource(rootDir: string): WorldSource {
  let indexCache: LeagueSummary[] | undefined;
  const leagueCache = new Map<string, LeagueBundle>();

  return {
    async listLeagues(): Promise<LeagueSummary[]> {
      if (!indexCache) {
        const raw = await readFile(join(rootDir, 'index.json'), 'utf8');
        indexCache = JSON.parse(raw) as LeagueSummary[];
      }
      return indexCache;
    },

    async loadLeague(leagueId: string): Promise<LeagueBundle> {
      const cached = leagueCache.get(leagueId);
      if (cached) return cached;
      let raw: string;
      try {
        raw = await readFile(join(rootDir, 'leagues', `${leagueId}.json`), 'utf8');
      } catch {
        throw new Error(`campionato non trovato: ${leagueId}`);
      }
      const bundle = JSON.parse(raw) as LeagueBundle;
      leagueCache.set(leagueId, bundle);
      return bundle;
    },
  };
}
