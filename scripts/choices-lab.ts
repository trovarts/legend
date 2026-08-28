/**
 * Verifica che nessuna strada sia sempre quella giusta (spec §6).
 * Per ogni bivio gioca la stessa carriera forzando ogni opzione, e confronta i punteggi.
 * Uso: npm run lab:choices -- --careers=150
 */
import { runCareer } from '../src/engine/career.js';
import { DILEMMA_CATALOG } from '../src/engine/dilemmaCatalog.js';
import { boldPolicy, type DilemmaPolicy } from '../src/engine/dilemmas.js';
import type { CandidateClub } from '../src/engine/market.js';
import { createFileWorldSource } from '../src/world/fileSource.js';

function arg(name: string, fallback: number): number {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const parsed = Number(raw.split('=')[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) >>> 0;
  return value;
}

/**
 * Politica che forza una certa opzione del bivio sotto esame e, su tutti gli altri,
 * **esplora** invece di ottimizzare.
 *
 * Serve perché `boldPolicy` non sceglie mai le opzioni dal valore atteso negativo:
 * con quella, litigare col mister non succede mai e il bivio della riconciliazione
 * resta irraggiungibile. Un utente vero sceglie anche col cuore, e il Lab deve poter
 * visitare tutti i rami. Resta deterministica: dipende solo dal seed e dall'id.
 */
function forcing(dilemmaId: string, optionId: string, seed: number): DilemmaPolicy {
  return (dilemma, context) => {
    if (dilemma.id === dilemmaId) {
      return dilemma.options.find((option) => option.id === optionId) ?? boldPolicy(dilemma, context);
    }
    const index = (seed + hash(dilemma.id)) % dilemma.options.length;
    return dilemma.options[index] ?? boldPolicy(dilemma, context);
  };
}

async function main(): Promise<void> {
  const careers = arg('careers', 150);

  const source = createFileWorldSource('public/world');
  const leagues = await source.listLeagues();
  const clubs: CandidateClub[] = [];
  for (const league of leagues.slice(0, 8)) {
    const bundle = await source.loadLeague(league.id);
    for (const club of bundle.clubs) {
      clubs.push({ club, leagueId: league.id, leagueName: league.name, leagueLevel: league.level });
    }
  }

  const failures: string[] = [];

  for (const entry of DILEMMA_CATALOG) {
    // Un contesto qualunque, solo per leggere gli id delle opzioni.
    const sample = entry.build({
      season: 5, age: 26, overall: 74, minutesShare: 0.5,
      injury: { severity: 'seria', matchesOut: 12, season: 5 },
      marks: [], clubName: 'Club', leagueLevel: 1, contractYearsLeft: 0, wonSomething: false,
    });

    const totals = new Map<string, number>();
    for (const option of sample.options) totals.set(option.id, 0);
    let counted = 0;

    for (let i = 0; i < careers; i += 1) {
      const start = clubs[i % clubs.length]!;
      const runs = sample.options.map((option) => {
        const result = runCareer({
          create: { name: 'Test', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: start.leagueLevel },
          world: { clubs, startClubId: start.club.id },
          seed: i,
          dilemmaPolicy: forcing(entry.id, option.id, i),
        });
        return {
          id: option.id,
          score: result.goat.total,
          met: result.choices.some((choice) => choice.dilemmaId === entry.id),
        };
      });

      // Se in questa carriera il bivio non si è mai presentato, le varianti sono identiche:
      // contarle falserebbe tutto assegnando la vittoria alla prima della lista.
      if (!runs.some((run) => run.met)) continue;
      const best = runs.reduce((champion, item) => (item.score > champion.score ? item : champion));
      if (runs.every((run) => run.score === best.score)) continue;

      counted += 1;
      totals.set(best.id, (totals.get(best.id) ?? 0) + 1);
    }

    if (counted === 0) {
      console.log(`${entry.id}: mai incontrato in ${careers} carriere — impossibile giudicarlo`);
      failures.push(`${entry.id}: non si presenta mai, quindi non è verificabile`);
      continue;
    }

    const line = [...totals.entries()]
      .map(([id, wins]) => `${id} ${((wins / counted) * 100).toFixed(0)}%`)
      .join(' | ');
    console.log(`${entry.id}: ${line}  (su ${counted} carriere in cui il bivio è comparso)`);

    for (const [id, wins] of totals) {
      const share = wins / counted;
      if (share > 0.7) {
        failures.push(`${entry.id}: la strada "${id}" è quella giusta nel ${(share * 100).toFixed(0)}% dei casi`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} scelte dominanti:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error('\nUna strada sempre giusta non è una scelta: ribilanciare gli effetti nel catalogo.');
    process.exit(1);
  }
  console.log('\nNessuna scelta dominante: ogni strada ha il suo perché.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
