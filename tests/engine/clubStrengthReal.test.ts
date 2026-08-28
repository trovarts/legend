import { beforeAll, describe, expect, it } from 'vitest';
import { clubStrength } from '../../src/engine/clubStrength.js';
import { createFileWorldSource } from '../../src/world/fileSource.js';
import type { Club } from '../../src/world/types.js';

describe('forza dei club veri', () => {
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

  it('la Serie A è mediamente più forte della Serie B', () => {
    const average = (clubs: Club[]): number =>
      clubs.reduce((sum, club) => sum + clubStrength(club), 0) / clubs.length;
    expect(average(serieA)).toBeGreaterThan(average(serieB) + 3);
  });

  it('le forze stanno in un intervallo plausibile per il calcio vero', () => {
    for (const club of [...serieA, ...serieB]) {
      expect(clubStrength(club)).toBeGreaterThan(55);
      expect(clubStrength(club)).toBeLessThan(90);
    }
  });

  it('dentro la Serie A esiste un divario fra big e piccole', () => {
    const values = serieA.map(clubStrength).sort((a, b) => b - a);
    expect(values[0]! - values.at(-1)!).toBeGreaterThan(4);
  });
});
