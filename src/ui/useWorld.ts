'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CandidateClub } from '../engine/market';
import { createFetchWorldSource } from '../world/fetchSource';
import type { LeagueSummary } from '../world/types';

/**
 * Carica l'indice dei campionati all'avvio e i singoli campionati su richiesta.
 * Il gioco parte con una manciata di kilobyte: i club arrivano quando servono.
 */
export function useWorld() {
  const source = useMemo(() => createFetchWorldSource('/world'), []);
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [clubs, setClubs] = useState<CandidateClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    source
      .listLeagues()
      .then(setLeagues)
      .catch(() => setError('Non riesco a caricare i campionati. Ricarica la pagina.'))
      .finally(() => setLoading(false));
  }, [source]);

  const loadLeagues = useCallback(
    async (ids: readonly string[]): Promise<void> => {
      if (ids.length === 0) return;
      setLoading(true);
      try {
        const bundles = await Promise.all(ids.map((id) => source.loadLeague(id)));
        const loaded: CandidateClub[] = [];
        for (const bundle of bundles) {
          for (const club of bundle.clubs) {
            loaded.push({
              club,
              leagueId: bundle.league.id,
              leagueName: bundle.league.name,
              leagueLevel: bundle.league.level,
            });
          }
        }
        setClubs((previous) => {
          const known = new Set(previous.map((entry) => entry.club.id));
          const fresh = loaded.filter((entry) => !known.has(entry.club.id));
          return fresh.length === 0 ? previous : [...previous, ...fresh];
        });
      } catch {
        setError('Non riesco a caricare questo campionato.');
      } finally {
        setLoading(false);
      }
    },
    [source],
  );

  const countries = useMemo(
    () => [...new Set(leagues.map((league) => league.country))].sort((a, b) => a.localeCompare(b)),
    [leagues],
  );

  return { leagues, countries, clubs, loading, error, loadLeagues };
}
