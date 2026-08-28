/**
 * Simulation Lab — gira molte carriere sui dati veri e verifica le invarianti di §6.
 * Uso: npm run lab -- --careers=2000 --seed=42
 * Esce con codice 1 se una invariante è violata.
 */
import { runCareer } from '../src/engine/career.js';
import type { CareerResult } from '../src/engine/types.js';
import { createFileWorldSource } from '../src/world/fileSource.js';
import type { Role } from '../src/world/types.js';

const ROLES: readonly Role[] = ['GK', 'DEF', 'MID', 'FWD'];

function arg(name: string, fallback: number): number {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const parsed = Number(raw.split('=')[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sorted: readonly number[], quantile: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * quantile))] ?? 0;
}

async function main(): Promise<void> {
  const careerCount = arg('careers', 2000);
  const baseSeed = arg('seed', 42);

  const source = createFileWorldSource('public/world');
  const leagues = await source.listLeagues();
  const bundles = await Promise.all(
    leagues.slice(0, 8).map((league) => source.loadLeague(league.id)),
  );
  const pool = bundles.flatMap((bundle) =>
    bundle.clubs.map((club) => ({ club, level: bundle.league.level, leagueId: bundle.league.id })),
  );
  if (pool.length === 0) throw new Error('nessun club caricato: eseguire prima npm run import:world');

  const results: CareerResult[] = [];
  const failures: string[] = [];

  for (let i = 0; i < careerCount; i += 1) {
    const seed = baseSeed + i;
    const entry = pool[i % pool.length]!;
    const role = ROLES[i % ROLES.length]!;
    const result = runCareer({
      create: {
        name: `Test ${i}`, nationality: 'Italy', role,
        age: 17, leagueLevel: entry.level,
      },
      club: entry.club,
      leagueId: entry.leagueId,
      seed,
    });
    results.push(result);

    for (const season of result.seasons) {
      if (season.overallEnd < 1 || season.overallEnd > 99) {
        failures.push(`carriera ${seed}: overall fuori scala (${season.overallEnd})`);
      }
      if (season.minutesShare < 0 || season.minutesShare > 1) {
        failures.push(`carriera ${seed}: minuti fuori scala (${season.minutesShare})`);
      }
    }
    if (result.retiredAt < 30 || result.retiredAt > 41) {
      failures.push(`carriera ${seed}: ritiro a ${result.retiredAt} anni`);
    }
    if (result.seasons.length === 0) {
      failures.push(`carriera ${seed}: nessuna stagione giocata`);
    }
  }

  // Determinismo: la prima carriera, rigiocata, deve venire identica.
  const first = pool[0]!;
  const a = runCareer({
    create: { name: 'Test 0', nationality: 'Italy', role: 'GK', age: 17, leagueLevel: first.level },
    club: first.club, leagueId: first.leagueId, seed: baseSeed,
  });
  const b = runCareer({
    create: { name: 'Test 0', nationality: 'Italy', role: 'GK', age: 17, leagueLevel: first.level },
    club: first.club, leagueId: first.leagueId, seed: baseSeed,
  });
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    failures.push('determinismo rotto: stesso seed, carriere diverse');
  }

  const seasonCounts = results.map((result) => result.seasons.length);
  const averageSeasons = average(seasonCounts);
  const averagePeak = average(results.map((result) => result.peakOverall));
  const averageRetirement = average(results.map((result) => result.retiredAt));

  console.log(`Carriere simulate: ${results.length}`);
  console.log(`Stagioni per carriera: media ${averageSeasons.toFixed(1)} (min ${Math.min(...seasonCounts)}, max ${Math.max(...seasonCounts)})`);
  console.log(`Picco di overall: media ${averagePeak.toFixed(1)}`);
  console.log(`Età al ritiro: media ${averageRetirement.toFixed(1)}`);

  const peaks = [...results.map((result) => result.peakOverall)].sort((a, b) => a - b);
  const elite = peaks.filter((peak) => peak >= 80).length / peaks.length;
  const minutes = results.map((result) =>
    average(result.seasons.map((season) => season.minutesShare)),
  );
  const benchWarmers = minutes.filter((share) => share < 0.2).length / minutes.length;
  console.log(`Distribuzione picco: p10 ${percentile(peaks, 0.1)} | p50 ${percentile(peaks, 0.5)} | p90 ${percentile(peaks, 0.9)} | p99 ${percentile(peaks, 0.99)}`);
  console.log(`Carriere sopra 80 di picco: ${(elite * 100).toFixed(1)}%`);
  console.log(`Minuti medi: ${average(minutes).toFixed(2)} | carriere da riserva (<0.2): ${(benchWarmers * 100).toFixed(1)}%`);
  console.log('  ^ in Fase 1 non esiste il mercato: chi parte in un club troppo forte non puo andarsene.');
  console.log('    Questo numero deve crollare in Fase 2, quando arrivano i trasferimenti.');

  for (const role of ROLES) {
    const byRole = results.filter((result) => result.player.role === role);
    console.log(`  ${role}: picco medio ${average(byRole.map((r) => r.peakOverall)).toFixed(1)} su ${byRole.length} carriere`);
  }

  if (averageSeasons < 12 || averageSeasons > 24) {
    failures.push(`durata media fuori dal previsto: ${averageSeasons.toFixed(1)} stagioni (atteso 12-24)`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} invarianti violate:`);
    for (const failure of failures.slice(0, 20)) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('\nTutte le invarianti rispettate.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
