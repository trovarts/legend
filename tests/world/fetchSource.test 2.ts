import { describe, expect, it, vi } from 'vitest';
import { createFetchWorldSource } from '../../src/world/fetchSource';
import type { LeagueBundle, LeagueSummary } from '../../src/world/types';

const index: LeagueSummary[] = [
  { id: 'serie-a-31', name: 'Serie A', country: 'Italy', level: 1, clubCount: 20 },
];
const bundle: LeagueBundle = { league: index[0]!, clubs: [{ id: 'c1', name: 'Napoli', squad: [] }] };

function fakeFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('index.json')) return new Response(JSON.stringify(index), { status: 200 });
    if (url.endsWith('serie-a-31.json')) return new Response(JSON.stringify(bundle), { status: 200 });
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
}

describe('createFetchWorldSource', () => {
  it("scarica l'indice dei campionati", async () => {
    expect(await createFetchWorldSource('/world', fakeFetch()).listLeagues()).toEqual(index);
  });

  it('scarica un campionato', async () => {
    const source = createFetchWorldSource('/world', fakeFetch());
    expect((await source.loadLeague('serie-a-31')).clubs[0]?.name).toBe('Napoli');
  });

  it('scarica ogni campionato una volta sola', async () => {
    const spy = fakeFetch();
    const source = createFetchWorldSource('/world', spy);
    await source.loadLeague('serie-a-31');
    await source.loadLeague('serie-a-31');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('su campionato inesistente lancia un errore leggibile', async () => {
    await expect(createFetchWorldSource('/world', fakeFetch()).loadLeague('non-esiste'))
      .rejects.toThrow('campionato non trovato');
  });
});
