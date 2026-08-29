/**
 * Verifica che nessuna strada sia sempre quella giusta (spec §6).
 * Per ogni bivio gioca la stessa carriera forzando ogni opzione, e confronta i punteggi.
 * Uso: npm run lab:choices -- --careers=150
 */
import { runCareer } from '../src/engine/career';
import { DILEMMA_CATALOG } from '../src/engine/dilemmaCatalog';
import { boldPolicy, type DilemmaPolicy } from '../src/engine/dilemmas';
import type { CandidateClub } from '../src/engine/market';
import { createPlayer } from '../src/engine/create';
import { createRng } from '../src/engine/rng';
import { runYouth, type CareerDecisions } from '../src/engine/play';
import { YOUTH_EVENT_CATALOG } from '../src/engine/youthEvents';
import { createFileWorldSource } from '../src/world/fileSource';

function arg(name: string, fallback: number): number {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const parsed = Number(raw.split('=')[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Una strada è dominante solo se vince più di quanto vincerebbe una moneta.
 *
 * La soglia secca del 70% è ingannevole sui campioni piccoli: con venti carriere e due
 * opzioni, una moneta arriva al 75% una volta ogni cinquanta, e con trentacinque bivi
 * sorvegliati il falso allarme è quasi garantito a ogni esecuzione. Qui si chiede che
 * il vantaggio superi anche l'oscillazione del caso — due deviazioni standard e mezzo —
 * così quello che resta è un difetto del catalogo, non una faccia della moneta.
 */
function dominante(vittorie: number, osservazioni: number, opzioni: number): boolean {
  if (osservazioni === 0) return false;
  const quota = vittorie / osservazioni;
  if (quota <= SOGLIA_DOMINANZA) return false;
  const atteso = osservazioni / opzioni;
  const oscillazione = Math.sqrt(osservazioni * (1 / opzioni) * (1 - 1 / opzioni));
  return vittorie > atteso + 2.5 * oscillazione;
}

/** Oltre questa quota una strada comincia a somigliare all'unica risposta giusta. */
const SOGLIA_DOMINANZA = 0.7;

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

/**
 * Gioca il vivaio forzando una risposta a un episodio, poi la carriera che ne segue.
 *
 * Il vivaio si risolve da solo (`runYouth`), quindi la carriera si gioca in una volta
 * sola con `runCareer`: passare da `playCareer` costerebbe una carriera intera per
 * ogni decisione, e sarebbero migliaia.
 */
function giocaDalVivaio(
  clubs: readonly CandidateClub[],
  start: CandidateClub,
  seed: number,
  eventId: string,
  optionId: string,
): { id: string; score: number; met: boolean } {
  const create = {
    name: 'Test', nationality: 'Italy', role: 'FWD' as const, age: 14,
    leagueLevel: start.leagueLevel,
  };
  const potential = createPlayer(create, createRng(seed)).potential;
  const decisions: CareerDecisions = { training: {}, dilemmas: {}, transfers: {} };
  let met = false;

  // Il vivaio: poche decisioni, e ognuna costa solo gli anni fra i ragazzi.
  let vivaio = runYouth({ seed, create, clubName: start.club.name, decisions, potential });
  for (let passo = 0; passo < 20 && vivaio.pending !== null; passo += 1) {
    const pending = vivaio.pending;
    if (pending.kind === 'youth') {
      decisions.youth = { ...decisions.youth, [String(pending.year)]: 'piano-completo' };
    } else if (pending.kind === 'youth-event') {
      const forzata = pending.dilemma.id === eventId
        ? optionId
        : pending.dilemma.options[(seed + hash(pending.dilemma.id)) % pending.dilemma.options.length]!.id;
      if (pending.dilemma.id === eventId) met = true;
      decisions.youthEvents = { ...decisions.youthEvents, [String(pending.year)]: forzata };
    } else if (pending.kind === 'promotion') {
      decisions.promotedAt = vivaio.youth.length;
    } else break; // l'agente non passa di qui
    vivaio = runYouth({ seed, create, clubName: start.club.name, decisions, potential });
  }

  const result = runCareer({
    create: { ...create, age: vivaio.age },
    world: { clubs, startClubId: start.club.id },
    seed,
    startOverall: vivaio.overall,
    startMarks: vivaio.startMarks,
    startMinutesBonus: vivaio.startMinutesBonus,
    dilemmaPolicy: forcing('', '', seed),
  });

  return { id: optionId, score: result.goat.total, met };
}

async function main(): Promise<void> {
  const careers = arg('careers', 150);

  const source = createFileWorldSource('public/world');
  const leagues = await source.listLeagues();
  const clubs: CandidateClub[] = [];
  for (const league of leagues.slice(0, 8)) {
    const bundle = await source.loadLeague(league.id);
    for (const club of bundle.clubs) {
      clubs.push({ club, leagueId: league.id, leagueName: league.name, leagueLevel: league.level, country: league.country });
    }
  }

  const failures: string[] = [];

  for (const entry of DILEMMA_CATALOG) {
    // Un contesto qualunque, solo per leggere gli id delle opzioni.
    const sample = entry.build({
      season: 5, age: 26, overall: 74, minutesShare: 0.5,
      injury: { severity: 'seria', matchesOut: 12, season: 5 },
      marks: [], clubName: 'Club', leagueLevel: 1, contractYearsLeft: 0, wonSomething: false,
      recentDilemmaIds: [],
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

    // Sotto una ventina di osservazioni il verdetto è rumore, non misura.
    const MINIMO = 20;
    if (counted > 0 && counted < MINIMO) {
      const line = [...totals.entries()]
        .map(([id, wins]) => `${id} ${((wins / counted) * 100).toFixed(0)}%`)
        .join(' | ');
      console.log(`${entry.id}: ${line}  (solo ${counted} carriere: campione troppo piccolo per giudicare)`);
      continue;
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
      if (dominante(wins, counted, sample.options.length)) {
        const share = wins / counted;
        failures.push(`${entry.id}: la strada "${id}" è quella giusta nel ${(share * 100).toFixed(0)}% dei casi (su ${counted})`);
      }
    }
  }

  // ── Gli episodi del vivaio ────────────────────────────────────────────────
  // Vivono dentro playCareer, non dentro runCareer: la carriera va giocata dal
  // primo giorno, rispondendo a tutto, con un'unica variabile — la risposta
  // all'episodio sotto esame.
  console.log('\nEpisodi del vivaio:');

  /*
   * Un giocatore vede due o tre episodi su dieci: perché ognuno arrivi a un campione
   * giudicabile servono molte più carriere che per i bivi. Costano poco — il vivaio si
   * risolve da solo e la carriera si gioca in una volta sola.
   */
  const vivaioCareers = Math.max(200, careers * 6);

  for (const entry of YOUTH_EVENT_CATALOG) {
    const sample = entry.build({
      year: 2, age: 15, clubName: 'Club', overall: 50, role: 'FWD',
      approach: 'piano-completo',
      season: {
        year: 2, age: 15, clubName: 'Club', approach: 'piano-completo',
        appearances: 20, goals: 6, assists: 3, rating: 6.9,
        overallStart: 46, overallEnd: 50, outcomeLabel: '+4 OVR',
      },
      usedEventIds: [],
    });

    const totals = new Map<string, number>();
    for (const option of sample.options) totals.set(option.id, 0);
    let counted = 0;

    for (let i = 0; i < vivaioCareers; i += 1) {
      const start = clubs[i % clubs.length]!;
      const runs = sample.options.map((option) => giocaDalVivaio(clubs, start, i, entry.id, option.id));

      // Se l'episodio non è capitato, le varianti sono la stessa carriera.
      if (!runs.some((run) => run.met)) continue;
      const best = runs.reduce((champion, item) => (item.score > champion.score ? item : champion));
      if (runs.every((run) => run.score === best.score)) continue;

      counted += 1;
      totals.set(best.id, (totals.get(best.id) ?? 0) + 1);
    }

    const line = [...totals.entries()]
      .map(([id, wins]) => `${id} ${counted === 0 ? '—' : ((wins / counted) * 100).toFixed(0)}%`)
      .join(' | ');

    if (counted === 0) {
      console.log(`${entry.id}: mai incontrato in ${vivaioCareers} carriere — impossibile giudicarlo`);
      failures.push(`${entry.id}: non si presenta mai, quindi non è verificabile`);
      continue;
    }
    if (counted < 20) {
      console.log(`${entry.id}: ${line}  (solo ${counted} carriere: campione troppo piccolo per giudicare)`);
      continue;
    }

    console.log(`${entry.id}: ${line}  (su ${counted} carriere in cui l'episodio è comparso)`);
    for (const [id, wins] of totals) {
      if (dominante(wins, counted, sample.options.length)) {
        const share = wins / counted;
        failures.push(`${entry.id}: la risposta "${id}" è quella giusta nel ${(share * 100).toFixed(0)}% dei casi (su ${counted})`);
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
