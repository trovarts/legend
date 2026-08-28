/**
 * Verifica che il gioco resti leggero.
 *
 * Misura il JavaScript che il browser scarica **davvero** aprendo /gioca — non tutti i
 * file prodotti dalla build. Il concorrente spedisce 3,2 MB in un unico file: questo è
 * il vantaggio che vogliamo poter misurare, non raccontare (spec §2 e §5.3).
 *
 * Uso: npm run check:bundle (dopo npm run build)
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Il limite è sul compresso, perché è quello che viaggia davvero in rete.
 * Misurato allo stesso modo, il concorrente ne spedisce 1.199.
 */
const LIMIT_KB = 240;
const CONCORRENTE_KB = 1199;
const PAGE = 'out/gioca.html';

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function directoryBytes(dir: string): number {
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    bytes += entry.isDirectory() ? directoryBytes(path) : statSync(path).size;
  }
  return bytes;
}

const html = readFileSync(PAGE, 'utf8');
const scripts = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+?\.js/g)].map((m) => m[0]))];

let firstLoad = 0;
let compressed = 0;
for (const src of scripts) {
  try {
    const file = readFileSync(join('out', src));
    firstLoad += file.byteLength;
    compressed += gzipSync(file, { level: 9 }).byteLength;
  } catch {
    // Un riferimento senza file su disco non è un peso per l'utente: si ignora.
  }
}

const world = directoryBytes('out/world');
const oneLeague = statSync('out/world/leagues/serie-a-31.json').size;

const compressedKb = compressed / 1024;
console.log(`Primo caricamento di /gioca: ${kb(compressed)} compressi (${kb(firstLoad)} grezzi, ${scripts.length} file)`);
console.log(`  il concorrente, misurato allo stesso modo: ${CONCORRENTE_KB} KB — siamo ${(CONCORRENTE_KB / compressedKb).toFixed(1)} volte più leggeri`);
console.log(`Dati del mondo: ${kb(world)} in totale, ma se ne scarica uno per volta`);
console.log(`  un campionato tipo, la Serie A: ${kb(oneLeague)}`);

if (compressedKb > LIMIT_KB) {
  console.error(`\nIl gioco è ingrassato: ${kb(compressed)} compressi contro un limite di ${LIMIT_KB} KB.`);
  process.exit(1);
}
console.log('\nPeso sotto controllo.');
