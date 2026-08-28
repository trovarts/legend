/**
 * Il sito statico si apre davvero?
 *
 * Il server di sviluppo perdona tutto: risolve i percorsi, riscrive gli indirizzi,
 * serve le pagine che non esistono. Un hosting statico no. Questo controllo prende la
 * cartella `out` appena costruita e verifica che i file che il gioco chiede ci siano
 * davvero, con i nomi giusti — la differenza fra «funziona sul mio computer» e
 * «funziona».
 *
 * Uso: npm run build && npm run check:static
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'out';
const base = process.env.BASE_PATH ?? '';

const richiesti = [
  'index.html',
  'gioca/index.html',
  'world/index.json',
];

const guasti: string[] = [];

for (const percorso of richiesti) {
  if (!existsSync(join(OUT, percorso))) guasti.push(`manca ${percorso}`);
}

// Un campionato a caso deve essere scaricabile, con dentro delle rose.
if (existsSync(join(OUT, 'world/index.json'))) {
  const index = JSON.parse(readFileSync(join(OUT, 'world/index.json'), 'utf8')) as { id: string; clubCount: number }[];
  if (index.length < 10) guasti.push(`solo ${index.length} campionati nel mondo pubblicato`);
  for (const lega of index.slice(0, 3)) {
    const file = join(OUT, 'world/leagues', `${lega.id}.json`);
    if (!existsSync(file)) {
      guasti.push(`manca il campionato ${lega.id}`);
      continue;
    }
    const bundle = JSON.parse(readFileSync(file, 'utf8')) as { clubs: { squad: unknown[] }[] };
    if (bundle.clubs.length === 0) guasti.push(`${lega.id} pubblicato senza club`);
    if ((bundle.clubs[0]?.squad.length ?? 0) === 0) guasti.push(`${lega.id} pubblicato senza rose`);
  }
}

// Gli indirizzi dentro la pagina devono puntare dove il sito vivrà davvero.
if (existsSync(join(OUT, 'gioca/index.html'))) {
  const pagina = readFileSync(join(OUT, 'gioca/index.html'), 'utf8');
  const attesi = `${base}/_next/`;
  if (!pagina.includes(attesi)) {
    guasti.push(`la pagina non punta a ${attesi}: con BASE_PATH="${base}" gli script non si caricherebbero`);
  }
}

if (guasti.length > 0) {
  console.error(`Il sito costruito non si aprirebbe:\n${guasti.map((g) => `  - ${g}`).join('\n')}`);
  process.exit(1);
}

console.log(`Sito statico a posto${base === '' ? '' : ` (sotto ${base})`}: pagine, mondo e indirizzi ci sono.`);
