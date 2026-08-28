/**
 * Il Lab del vivaio: le carriere come le gioca davvero l'utente.
 *
 * Il Simulation Lab misura il motore da diciassette anni in poi, con una politica
 * di mercato sensata. Questo invece parte dal vivaio a quattordici anni e sceglie
 * male apposta (prima opzione a ogni bivio): è il pavimento del gioco, e serve a
 * sapere se anche chi comincia in fondo alla piramide può arrivare da qualche parte.
 *
 * Uso: npm run lab:vivaio -- 4
 */
import { playCareer, type CareerSave } from '../src/engine/play';
import type { CandidateClub } from '../src/engine/market';
import { createFileWorldSource } from '../src/world/fileSource';
import type { YouthApproach } from '../src/engine/youth';

const source = createFileWorldSource('public/world');
// Lo stesso mondo che carica il gioco: i campionati del proprio paese più una
// dozzina di altri. Serve a misurare anche quanto il mercato porta all'estero.
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
const livello = Number(process.argv[2] ?? '4');
const quarta = clubs.filter((c) => c.leagueLevel === livello);

const APPROCCI: YouthApproach[] = ['forza-il-ritmo', 'piano-completo', 'proteggi-la-crescita'];
const picchi: number[] = [];
const goat: number[] = [];
const livelliMigliori: number[] = [];
const etaPrimaStagione: number[] = [];
const ovrPrimaStagione: number[] = [];
let stagioniTotali = 0;
let stagioniInPatria = 0;

for (let seed = 0; seed < 200; seed += 1) {
  const start = quarta[seed % quarta.length]!;
  const save: CareerSave = {
    version: 1, seed,
    create: { name: 'Test', nationality: 'Italy', role: 'FWD', age: 14, leagueLevel: livello },
    startClubId: start.club.id,
    decisions: { training: {}, dilemmas: {}, transfers: {}, agentId: 'amina-diallo', youth: {}, promotedAt: 3 },
  };
  // Si gioca da soli: a ogni decisione mancante si prende la prima opzione.
  let state = playCareer(save, clubs);
  let corrente = save;
  let giri = 0;
  while (!state.finished && giri < 400) {
    giri += 1;
    const p = state.pending;
    if (p === null) break;
    const d = { ...corrente.decisions };
    if (p.kind === 'agent') d.agentId = p.options[0]!.id;
    else if (p.kind === 'youth') d.youth = { ...d.youth, [String(p.year)]: APPROCCI[seed % 3]! };
    else if (p.kind === 'promotion') d.promotedAt = state.youth.length;
    else if (p.kind === 'training') d.training = { ...d.training, [String(p.season)]: 'tecnica' };
    else if (p.kind === 'dilemma') d.dilemmas = { ...d.dilemmas, [`${p.season}:${p.dilemma.id}`]: p.dilemma.options[0]!.id };
    else if (p.kind === 'transfer') d.transfers = { ...d.transfers, [String(p.season)]: p.offers[0]?.clubId ?? 'resta' };
    corrente = { ...corrente, decisions: d };
    state = playCareer(corrente, clubs);
  }
  for (const st of state.seasons) {
    stagioniTotali += 1;
    if (clubs.find((c) => c.club.id === st.clubId)?.country === 'Italy') stagioniInPatria += 1;
  }
  const prima = state.seasons[0];
  if (prima) { etaPrimaStagione.push(prima.age); ovrPrimaStagione.push(prima.overallStart); }
  if (state.result) {
    picchi.push(state.result.peakOverall);
    goat.push(state.result.goat.total);
    livelliMigliori.push(Math.min(...state.seasons.map((st) => st.leagueLevel)));
  }
}

const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const mediaPatria = stagioniTotali === 0 ? 0 : stagioniInPatria / stagioniTotali;
console.log(`Carriere giocate dal vivaio, partendo dal livello ${livello}: ${picchi.length}`);
console.log(`Prima stagione: età media ${media(etaPrimaStagione).toFixed(1)} | overall medio ${media(ovrPrimaStagione).toFixed(1)}`);
console.log(`Picco: medio ${media(picchi).toFixed(1)} | massimo ${Math.max(...picchi)} | minimo ${Math.min(...picchi)}`);
console.log(`Sopra 80 di picco: ${((picchi.filter((p) => p >= 80).length / picchi.length) * 100).toFixed(1)}%`);
console.log(`Punteggio GOAT: medio ${media(goat).toFixed(0)} | massimo ${Math.max(...goat)}`);
console.log(`Categoria più alta raggiunta: ${media(livelliMigliori).toFixed(2)} (1 = massima serie)`);
console.log(`Stagioni giocate in patria: ${(mediaPatria * 100).toFixed(0)}%`);

const guasti: string[] = [];
const etaMedia = media(etaPrimaStagione);
if (etaMedia < 15 || etaMedia > 19) guasti.push(`si esce dal vivaio a ${etaMedia.toFixed(1)} anni (attesi 15-19)`);
const ovrMedio = media(ovrPrimaStagione);
if (ovrMedio < 44 || ovrMedio > 58) guasti.push(`si esce dal vivaio con overall ${ovrMedio.toFixed(1)} (atteso 44-58)`);
if (media(picchi) < 60) guasti.push(`picco medio troppo basso: ${media(picchi).toFixed(1)}`);
// Il calcio è ancorato a un paese: se si emigra sempre, o mai, non è più un mercato.
if (mediaPatria < 0.4 || mediaPatria > 0.95) {
  guasti.push(`mercato sbilanciato: ${(mediaPatria * 100).toFixed(0)}% delle stagioni in patria (atteso 40-95%)`);
}
if (Math.max(...picchi) < 80) guasti.push('nessuna carriera arriva a 80 di picco: il sogno è irraggiungibile');
if (livello > 1 && media(livelliMigliori) > livello - 0.5) {
  guasti.push(`chi parte dal livello ${livello} non risale: si ferma in media a ${media(livelliMigliori).toFixed(2)}`);
}

if (guasti.length > 0) {
  console.error(`\n${guasti.length} problemi:`);
  for (const guasto of guasti) console.error(`  - ${guasto}`);
  process.exit(1);
}
console.log('\nAnche partendo dal fondo, la carriera sta in piedi.');
