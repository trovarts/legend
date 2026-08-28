/** Stampa il racconto di una carriera intera: serve a leggerla, non a misurarla. */
import { runCareer } from '../src/engine/career';
import type { CandidateClub } from '../src/engine/market';
import { seasonMoments } from '../src/engine/moments';
import { createFileWorldSource } from '../src/world/fileSource';

const source = createFileWorldSource('public/world');
const tutte = await source.listLeagues();
const leagues = [
  ...tutte.filter((l) => l.country === 'Italy'),
  ...tutte.filter((l) => l.country !== 'Italy').slice(0, 12),
];
const clubs: CandidateClub[] = [];
for (const league of leagues) {
  const bundle = await source.loadLeague(league.id);
  for (const club of bundle.clubs) {
    clubs.push({ club, leagueId: league.id, leagueName: league.name, leagueLevel: league.level, country: league.country });
  }
}

const seed = Number(process.argv[2] ?? '7');
const ruolo = (process.argv[3] ?? 'FWD') as 'GK' | 'DEF' | 'MID' | 'FWD';
const start = clubs.find((c) => c.leagueLevel === 4)!;
const result = runCareer({
  seed,
  create: { name: 'Diego Trovato', nationality: 'Italy', role: ruolo, age: 17, leagueLevel: 4 },
  world: { clubs, startClubId: start.club.id },
});

console.log(`\n${'='.repeat(70)}\nDiego Trovato (${ruolo}) — dal ${start.club.name}, ${start.leagueName}\n${'='.repeat(70)}`);
let precedente;
for (const stagione of result.seasons) {
  const obiettivi = stagione.objectivesMet
    ? ` [obiettivi ${stagione.objectivesMet.primary ? '✓' : '✕'}${stagione.objectivesMet.secondary ? '✓' : '✕'}]`
    : '';
  const salto = stagione.movement ? ` ${stagione.movement.toUpperCase()}` : '';
  console.log(
    `\n— Stagione ${stagione.season} · ${stagione.age} anni · ${stagione.clubName} (${stagione.leagueName})`
    + `\n  ${stagione.position}° · ${stagione.stats.appearances}pres ${stagione.stats.goals}g ${stagione.stats.assists}a `
    + `media ${stagione.stats.rating.toFixed(1)} · ovr ${stagione.overallStart}→${stagione.overallEnd}${salto}${obiettivi}`,
  );
  for (const momento of seasonMoments({
    record: stagione, previous: precedente, isFirstSeason: stagione.season === 1,
    playerName: 'Diego Trovato', before: result.seasons.slice(0, stagione.season - 1),
  })) {
    console.log(`   ${momento.tone === 'alto' ? '▲' : momento.tone === 'basso' ? '▼' : '·'} ${momento.text}`);
  }
  precedente = stagione;
}
console.log(`\n${'='.repeat(70)}`);
console.log(`Ritirato a ${result.retiredAt} · GOAT ${result.goat.total} · picco ${result.peakOverall}`);
console.log(`Club: ${result.clubsPlayed.join(' → ')}`);
console.log(`Trofei: ${result.trophies.map((t) => t.competitionName).join(', ') || 'nessuno'}`);
