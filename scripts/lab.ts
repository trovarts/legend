/**
 * Simulation Lab — gira molte carriere sui dati veri e verifica le invarianti di §6.
 * Uso: npm run lab -- --careers=2000 --seed=42
 * Esce con codice 1 se una invariante è violata.
 */
import { runCareer } from '../src/engine/career';
import type { CandidateClub } from '../src/engine/market';
import type { CareerResult } from '../src/engine/types';
import { createFileWorldSource } from '../src/world/fileSource';
import type { Role } from '../src/world/types';

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
        country: league.country,
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
    // Ritirarsi presto è legittimo se lo si è scelto: le infiltrazioni bruciano anni,
    // ed è la posta dichiarata del bivio. Deve però restare spiegato, non arbitrario.
    const earliest = Math.max(25, 30 + result.careerYearsBurned);
    if (result.retiredAt < earliest || result.retiredAt > 41) {
      failures.push(
        `carriera ${seed}: ritiro a ${result.retiredAt} anni con ${result.careerYearsBurned} anni bruciati`,
      );
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
  // Con quattro divisioni un titolo esiste anche in fondo alla piramide: giusto che si
  // festeggi, ma la soglia severa vale per i trofei che pesano davvero (D-007).
  const primaFascia = (result: CareerResult): boolean =>
    result.trophies.some((trofeo) => {
      if (trofeo.kind === 'continental') return true;
      const stagione = result.seasons.find((s) => s.season === trofeo.season);
      return (stagione?.leagueLevel ?? 4) === 1;
    });
  const withMajorTrophy = results.filter(primaFascia).length / results.length;
  const withAward = results.filter((result) => result.awards.length > 0).length / results.length;
  const capped = results.filter((result) => result.totalCaps > 0).length / results.length;
  const values = [...results.map((result) => result.peakValueEur)].sort((a, b) => a - b);
  const goatScores = [...results.map((result) => result.goat.total)].sort((a, b) => a - b);
  const rivalWins =
    results.filter((result) => result.seasonsAheadOfRival < result.seasons.length / 2).length /
    results.length;
  const choicesPerCareer = average(results.map((result) => result.choices.length));
  const injuriesPerCareer = average(results.map((result) => result.injuries.length));
  const withPermanentMark =
    results.filter((result) => result.marks.some((mark) => mark.id === 'ginocchio-fragile')).length /
    results.length;
  const showdownRate =
    results.filter((result) => result.showdowns.length > 0).length / results.length;

  console.log(`Carriere simulate: ${results.length} su ${clubs.length} club`);
  console.log(`Stagioni per carriera: media ${averageSeasons.toFixed(1)} (min ${Math.min(...seasonCounts)}, max ${Math.max(...seasonCounts)})`);
  console.log(`Distribuzione picco: p10 ${percentile(peaks, 0.1)} | p50 ${percentile(peaks, 0.5)} | p90 ${percentile(peaks, 0.9)} | p99 ${percentile(peaks, 0.99)} | max ${peaks.at(-1)}`);
  console.log(`Carriere sopra 80 di picco: ${((peaks.filter((p) => p >= 80).length / peaks.length) * 100).toFixed(1)}% | sopra 85: ${((peaks.filter((p) => p >= 85).length / peaks.length) * 100).toFixed(2)}%`);
  console.log(`Minuti medi: ${average(minutes).toFixed(2)} | carriere da riserva (<0.2): ${(benchWarmers * 100).toFixed(1)}%`);
  console.log(`Gol per stagione da titolare: media ${average(goalsPerSeason).toFixed(1)} | attaccanti ${average(strikerGoals).toFixed(1)} | massimo ${Math.max(...goalsPerSeason, 0)}`);
  console.log(`Club per carriera: media ${average(clubCounts).toFixed(1)} (max ${Math.max(...clubCounts)})`);
  const perTipo = new Map<string, number>();
  for (const r of results) for (const t of r.trophies) perTipo.set(t.kind, (perTipo.get(t.kind) ?? 0) + 1);
  console.log(`Trofei per tipo: ${[...perTipo].map(([k, n]) => `${k} ${n}`).join(' | ')}`);
  console.log(`Trofei di prima fascia: ${(withMajorTrophy * 100).toFixed(1)}% delle carriere`);
  console.log(`Con almeno un trofeo: ${(withTrophy * 100).toFixed(1)}% | con un premio: ${(withAward * 100).toFixed(1)}% | con presenze in nazionale: ${(capped * 100).toFixed(1)}%`);
  console.log(`Valore di picco mediano: ${(percentile(values, 0.5) / 1e6).toFixed(1)}M | massimo ${(values.at(-1)! / 1e6).toFixed(0)}M`);

  console.log(`Punteggio GOAT: p10 ${percentile(goatScores, 0.1)} | p50 ${percentile(goatScores, 0.5)} | p90 ${percentile(goatScores, 0.9)} | max ${goatScores.at(-1)}`);
  console.log(`Il Rivale chiude davanti nel ${(rivalWins * 100).toFixed(1)}% delle carriere`);
  console.log(`Decisioni per carriera: ${choicesPerCareer.toFixed(1)} | infortuni: ${injuriesPerCareer.toFixed(1)} | con ginocchio fragile: ${(withPermanentMark * 100).toFixed(1)}%`);
  console.log(`Carriere con almeno uno scontro diretto: ${(showdownRate * 100).toFixed(1)}%`);

  for (const role of ROLES) {
    const byRole = results.filter((result) => result.player.role === role);
    // Anche l'obiettivo personale va guardato per ruolo: chiedere a un difensore una
    // media voto da attaccante è chiedergli una cosa che il modello non produce, e
    // una media generale al 39% non lo mostra.
    const stagioni = byRole.flatMap((r) => r.seasons).filter((s) => s.objectivesMet !== undefined);
    const centrato = stagioni.length === 0 ? 0
      : stagioni.filter((s) => s.objectivesMet!.secondary).length / stagioni.length;
    console.log(
      `  ${role}: picco medio ${average(byRole.map((r) => r.peakOverall)).toFixed(1)} su ${byRole.length} carriere`
      + ` · obiettivo personale centrato nel ${(centrato * 100).toFixed(0)}%`,
    );
    if (stagioni.length > 100 && (centrato < 0.15 || centrato > 0.85)) {
      failures.push(`obiettivo personale sbilanciato per ${role}: centrato nel ${(centrato * 100).toFixed(0)}% (atteso 15-85%)`);
    }
  }

  if (averageSeasons < 12 || averageSeasons > 24) {
    failures.push(`durata media fuori dal previsto: ${averageSeasons.toFixed(1)} stagioni (atteso 12-24)`);
  }
  if (average(clubCounts) < 1.5) {
    failures.push(`quasi nessuno cambia squadra: media ${average(clubCounts).toFixed(2)} club per carriera`);
  }
  const maxGoals = Math.max(...goalsPerSeason, 0);
  if (maxGoals > 45) failures.push(`stagione irreale da ${maxGoals} gol`);
  if (withTrophy > 0.85) {
    failures.push(`si vince troppo: ${(withTrophy * 100).toFixed(1)}% delle carriere alza qualcosa`);
  }
  if (withTrophy < 0.2) {
    failures.push(`troppo poche carriere con trofei: ${(withTrophy * 100).toFixed(1)}%`);
  }
  // Un trofeo deve restare un traguardo: se lo vincono quasi tutti, non vale niente.
  if (withMajorTrophy > 0.7) {
    failures.push(`i trofei che contano sono troppo facili: ${(withMajorTrophy * 100).toFixed(1)}% delle carriere`);
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

  // Il Rivale deve essere un avversario vero: se vince quasi sempre è frustrante,
  // se perde quasi sempre è inutile (spec §3.4).
  if (rivalWins < 0.3 || rivalWins > 0.7) {
    failures.push(`il Rivale è sbilanciato: chiude davanti nel ${(rivalWins * 100).toFixed(1)}% delle carriere (atteso 30-70%)`);
  }
  if (choicesPerCareer < 5) {
    failures.push(`troppe poche decisioni per carriera: ${choicesPerCareer.toFixed(1)}`);
  }
  if (injuriesPerCareer < 1 || injuriesPerCareer > 8) {
    failures.push(`infortuni fuori scala: ${injuriesPerCareer.toFixed(1)} per carriera (atteso 1-8)`);
  }
  // La piramide dev'essere viva: se nessuno sale ne' scende, le quattro divisioni
  // sono un disegno e non un gioco (la lezione di D-011: verificare il verificatore).
  const stagioniTotali = results.reduce((somma, r) => somma + r.seasons.length, 0);
  const promozioni = results.reduce(
    (somma, r) => somma + r.seasons.filter((s) => s.movement === 'promosso').length, 0);
  const retrocessioni = results.reduce(
    (somma, r) => somma + r.seasons.filter((s) => s.movement === 'retrocesso').length, 0);
  const quotaPromozioni = stagioniTotali === 0 ? 0 : promozioni / stagioniTotali;
  const quotaRetrocessioni = stagioniTotali === 0 ? 0 : retrocessioni / stagioniTotali;
  console.log(
    `Promozioni: ${(quotaPromozioni * 100).toFixed(1)}% delle stagioni | retrocessioni: ${(quotaRetrocessioni * 100).toFixed(1)}%`,
  );
  if (quotaPromozioni < 0.01 || quotaPromozioni > 0.3) {
    failures.push(`promozioni fuori scala: ${(quotaPromozioni * 100).toFixed(1)}% delle stagioni (atteso 1-30%)`);
  }
  if (quotaRetrocessioni < 0.01 || quotaRetrocessioni > 0.3) {
    failures.push(`retrocessioni fuori scala: ${(quotaRetrocessioni * 100).toFixed(1)}% delle stagioni (atteso 1-30%)`);
  }

  // Un obiettivo mai raggiunto è una punizione, uno sempre raggiunto è un arredo.
  const conObiettivi = results.flatMap((r) => r.seasons).filter((s) => s.objectivesMet !== undefined);
  const quotaPrincipale = conObiettivi.length === 0 ? 0
    : conObiettivi.filter((s) => s.objectivesMet!.primary).length / conObiettivi.length;
  const quotaSecondario = conObiettivi.length === 0 ? 0
    : conObiettivi.filter((s) => s.objectivesMet!.secondary).length / conObiettivi.length;
  console.log(
    `Obiettivi del club centrati: principale ${(quotaPrincipale * 100).toFixed(0)}% | secondario ${(quotaSecondario * 100).toFixed(0)}%`,
  );
  if (quotaPrincipale < 0.25 || quotaPrincipale > 0.75) {
    failures.push(`obiettivo principale sbilanciato: centrato nel ${(quotaPrincipale * 100).toFixed(0)}% delle stagioni (atteso 25-75%)`);
  }
  if (quotaSecondario < 0.25 || quotaSecondario > 0.85) {
    failures.push(`obiettivo secondario sbilanciato: centrato nel ${(quotaSecondario * 100).toFixed(0)}% delle stagioni (atteso 25-85%)`);
  }

  const medianGoat = percentile(goatScores, 0.5);
  if (medianGoat < 50 || medianGoat > 700) {
    failures.push(`punteggio GOAT mediano fuori scala: ${medianGoat}`);
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
