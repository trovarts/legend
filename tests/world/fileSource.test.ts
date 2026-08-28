import { describe, expect, it } from 'vitest';
import { createFileWorldSource } from '../../src/world/fileSource';

const source = createFileWorldSource('public/world');

describe('createFileWorldSource', () => {
  it('elenca i campionati importati', async () => {
    const leagues = await source.listLeagues();
    expect(leagues.length).toBeGreaterThan(30);
    const first = leagues[0];
    expect(first).toBeDefined();
    expect(typeof first?.id).toBe('string');
    expect(first?.level).toBeGreaterThanOrEqual(1);
  });

  it('carica un campionato con club e rose', async () => {
    const leagues = await source.listLeagues();
    const serieA = leagues.find((league) => league.name === 'Serie A' && league.country === 'Italy');
    expect(serieA).toBeDefined();

    const bundle = await source.loadLeague(serieA!.id);
    expect(bundle.clubs.length).toBeGreaterThan(15);

    const napoli = bundle.clubs.find((club) => club.name === 'Napoli');
    expect(napoli).toBeDefined();
    expect(napoli!.squad.length).toBeGreaterThan(20);
    expect(napoli!.squad.some((player) => player.role === 'GK')).toBe(true);
  });

  it('mette in cache: due caricamenti restituiscono lo stesso oggetto', async () => {
    const leagues = await source.listLeagues();
    const id = leagues[0]!.id;
    const a = await source.loadLeague(id);
    const b = await source.loadLeague(id);
    expect(a).toBe(b);
  });

  it('su campionato inesistente lancia un errore leggibile', async () => {
    await expect(source.loadLeague('non-esiste-0')).rejects.toThrow('campionato non trovato');
  });
});
