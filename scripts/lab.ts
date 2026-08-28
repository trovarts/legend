/**
 * Simulation Lab — gira molte carriere sui dati veri e verifica le invarianti di §6.
 * Uso: npm run lab -- --careers=2000 --seed=42
 * Esce con codice 1 se una invariante è violata.
 */
import { runCareer } from '../src/engine/career.js';
import type { CandidateClub } from '../src/engine/market.js';
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
  const clubs: CandidateClub[] = [];
  for (const league of leagues.slice(0, 12)) {
    const bundle = await source.loadLeague(league.id);
    for (const club of bundle.clubs) {
      clubs.push({
        club,
        leagueId: league.id,
        leagueName: league.name,
        leagueLevel: league.level,
      });
    }
  }
  if (clubs.length === 0) throw new Error('nessun club caricato: eseguire prima npm run import:world');

  const results: CareerResult[] = [];
  const failures: string[] = [];

  for (let i = 0; i < careerCount; i += 1) {
    const seed = baseSeed + i;
    const start = clubs[i % clubs.length]!;
    const role = ROLES[i % ROLES.length]!;
    const result = runCareer({
      create: {
        name: `Test ${i}`, nationality: 'Italy', role,
        age: 17, leagueLevel: start.leagueLevel,
      },
      world: { clubs, startClubId: start.club.id },
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
      if (season.stats.minutes > season.stats.appearances * 90) {
        failures.push(`carriera ${seed}: minuti incoerenti con le presenze`);
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
  const first = clubs[0]!;
  const twice = [0, 1].map(() =>
    JSON.stringify(
      runCareer({
        create: { name: 'Test 0', nationality: 'Italy', role: 'GK', age: 17, leagueLevel: first.leagueLevel },
        world: { clubs, startClubId: first.club.id },
        seed: baseSeed,
      }),
    ),
  );
  if (twice[0] !== twice[1]) failures.push('determinismo rotto: stesso seed, carriere diverse');

  const seasonCounts = results.map((result) => result.seasons.length);
  const averageSeasons = average(seasonCounts);
  const peaks = [...results.map((result) => result.peakOverall)].sort((a, b) => a - b);
  const minutes = results.map((result) =>
    average(result.seasons.map((season) => season.minutesShare)),
  );
  const benchWarmers = minutes.filter((share) => share < 0.2).length / minutes.length;
  const goalsPerSeason = results.flatMap((result) =>
    result.seasons.filter((season) => season.stats.appearances >= 15).map((season) => season.stats.goals),
  );
  // La media su tutti i ruoli non dice niente: un portiere abbassa tutto. Guardiamo gli attaccanti.
  const strikerGoals = results
    .filter((result) => result.player.role === 'FWD')
    .flatMap((result) =>
      result.seasons.filter((season) => season.stats.appearances >= 20).map((season) => season.stats.goals),
    );
  const clubCounts = results.map((result) => result.clubsPlayed.length);
  const withTrophy = results.filter((result) => result.trophies.length > 0).length / results.length;
  const withAward = results.filter((result) => result.awards.length > 0).length / results.length;
  const capped = results.filter((result) => result.totalCaps > 0).length / results.length;
  const values = [...results.map((result) => result.peakValueEur)].sort((a, b) => a - b);

  console.log(`Carriere simulate: ${results.length} su ${clubs.length} club`);
  console.log(`Stagioni per carriera: media ${averageSeasons.toFixed(1)} (min ${Math.min(...seasonCounts)}, max ${Math.max(...seasonCounts)})`);
  console.log(`Distribuzione picco: p10 ${percentile(peaks, 0.1)} | p50 ${percentile(peaks, 0.5)} | p90 ${percentile(peaks, 0.9)} | p99 ${percentile(peaks, 0.99)} | max ${peaks.at(-1)}`);
  console.log(`Carriere sopra 80 di picco: ${((peaks.filter((p) => p >= 80).length / peaks.length) * 100).toFixed(1)}% | sopra 85: ${((peaks.filter((p) => p >= 85).length / peaks.length) * 100).toFixed(2)}%`);
  console.log(`Minuti medi: ${average(minutes).toFixed(2)} | carriere da riserva (<0.2): ${(benchWarmers * 100).toFixed(1)}%`);
  console.log(`Gol per stagione da titolare: media ${average(goalsPerSeason).toFixed(1)} | attaccanti ${average(strikerGoals).toFixed(1)} | massimo ${Math.max(...goalsPerSeason, 0)}`);
  console.log(`Club per carriera: media ${average(clubCounts).toFixed(1)} (max ${Math.max(...clubCounts)})`);
  console.log(`Con almeno un trofeo: ${(withTrophy * 100).toFixed(1)}% | con un premio: ${(withAward * 100).toFixed(1)}% | con presenze in nazionale: ${(capped * 100).toFixed(1)}%`);
  console.log(`Valore di picco mediano: ${(percentile(values, 0.5) / 1e6).toFixed(1)}M | massimo ${(values.at(-1)! / 1e6).toFixed(0)}M`);

  for (const role of ROLES) {
    const byRole = results.filter((result) => result.player.role === role);
    console.log(`  ${role}: picco medio ${average(byRole.map((r) => r.peakOverall)).toFixed(1)} su ${byRole.length} carriere`);
  }

  if (averageSeasons < 12 || averageSeasons > 24) {
    failures.push(`durata media fuori dal previsto: ${averageSeasons.toFixed(1)} stagioni (atteso 12-24)`);
  }
  if (average(clubCounts) < 1.5) {
    failures.push(`quasi nessuno cambia squadra: media ${average(clubCounts).toFixed(2)} club per carriera`);
  }
  const maxGoals = Math.max(...goalsPerSeason, 0);
  if (maxGoals > 45) failures.push(`stagione irreale da ${maxGoals} gol`);
  if (withTrophy < 0.2) {
    failures.push(`troppo poche carriere con trofei: ${(withTrophy * 100).toFixed(1)}%`);
  }
  // Un trofeo deve restare un traguardo: se lo vincono quasi tutti, non vale niente.
  if (withTrophy > 0.75) {
    failures.push(`i trofei sono troppo facili: li vince il ${(withTrophy * 100).toFixed(1)}% delle carriere`);
  }
  if (average(strikerGoals) < 5 || average(strikerGoals) > 16) {
    failures.push(`gol degli attaccanti fuori scala: media ${average(strikerGoals).toFixed(1)} (atteso 5-16)`);
  }

  // Le due verifiche che la Fase 2 doveva rendere vere (decisione D-004).
  if (benchWarmers > 0.15) {
    failures.push(`troppe carriere da riserva: ${(benchWarmers * 100).toFixed(1)}% (atteso sotto il 15%)`);
  }
  const legends = peaks.filter((peak) => peak >= 85).length / peaks.length;
  if (legends < 0.01) {
    failures.push(`nessuna leggenda: solo ${(legends * 100).toFixed(2)}% supera 85 di picco (atteso almeno l'1%)`);
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
