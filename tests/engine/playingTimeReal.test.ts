import { beforeAll, describe, expect, it } from 'vitest';
import { playingTimeShare } from '../../src/engine/playingTime';
import { createFileWorldSource } from '../../src/world/fileSource';
import type { Club } from '../../src/world/types';

/**
 * Questi test usano le ROSE VERE, non squadre inventate.
 * Nascono da un bug trovato sul campo: un diciassettenne al Napoli — e anche alla
 * Carrarese in Serie B — giocava il 2% dei minuti per sedici stagioni di fila.
 * La vecchia formula contava quanti erano più forti di lui e si azzerava dopo
 * quattro posizioni: con rose reali da 28 giocatori succedeva sempre.
 */
describe('minuti nelle rose reali', () => {
  let serieA: Club[];
  let serieB: Club[];

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const leagues = await source.listLeagues();
    const a = leagues.find((l) => l.name === 'Serie A' && l.country === 'Italy')!;
    const b = leagues.find((l) => l.name === 'Serie B' && l.country === 'Italy')!;
    serieA = (await source.loadLeague(a.id)).clubs;
    serieB = (await source.loadLeague(b.id)).clubs;
  });

  it('un giovane in Serie B non è mai condannato a zero minuti', () => {
    for (const club of serieB) {
      const share = playingTimeShare({ overall: 55, age: 18, role: 'FWD' }, club.squad);
      expect(share).toBeGreaterThan(0.05);
    }
  });

  it('essere vicini ai titolari conta più di quanti ce ne sono davanti', () => {
    const club = serieB[0]!;
    const vicino = playingTimeShare({ overall: 66, age: 24, role: 'FWD' }, club.squad);
    const lontano = playingTimeShare({ overall: 48, age: 24, role: 'FWD' }, club.squad);
    expect(vicino).toBeGreaterThan(lontano + 0.2);
  });

  it('lo stesso ragazzo gioca di più in Serie B che in Serie A', () => {
    const average = (clubs: Club[]): number =>
      clubs.reduce(
        (sum, club) => sum + playingTimeShare({ overall: 58, age: 19, role: 'FWD' }, club.squad),
        0,
      ) / clubs.length;
    expect(average(serieB)).toBeGreaterThan(average(serieA) + 0.05);
  });

  it('un fuoriclasse è titolare in qualunque club di Serie A', () => {
    for (const club of serieA) {
      const share = playingTimeShare({ overall: 88, age: 27, role: 'FWD' }, club.squad);
      expect(share).toBeGreaterThan(0.7);
    }
  });

  it('la crescita dei minuti col talento è graduale, non a scalini', () => {
    const club = serieA.find((c) => c.name === 'Napoli')!;
    const shares = [50, 55, 60, 65, 70, 75, 80, 85].map((overall) =>
      playingTimeShare({ overall, age: 24, role: 'FWD' }, club.squad),
    );
    // ogni gradino deve valere qualcosa: nessun tratto piatto lungo
    for (let i = 1; i < shares.length; i += 1) {
      expect(shares[i]!).toBeGreaterThanOrEqual(shares[i - 1]!);
    }
    expect(shares.at(-1)! - shares[0]!).toBeGreaterThan(0.5);
  });
});
