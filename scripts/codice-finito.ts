/** Gioca una carriera intera senza interfaccia e stampa il codice da incollare. */
import { decisionKey, playCareer, type CareerSave } from '../src/engine/play';
import type { CandidateClub } from '../src/engine/market';
import { encodeSave } from '../src/engine/save';
import { createFileWorldSource } from '../src/world/fileSource';

const source = createFileWorldSource('public/world');
const tutte = await source.listLeagues();
const leagues = [
  ...tutte.filter((l) => l.country === 'Italy'),
  ...tutte.filter((l) => l.country !== 'Italy').slice(0, 12),
];
const clubs: CandidateClub[] = [];
for (const lg of leagues) {
  const b = await source.loadLeague(lg.id);
  for (const c of b.clubs) clubs.push({ club: c, leagueId: lg.id, leagueName: lg.name, leagueLevel: lg.level, country: lg.country });
}

const start = clubs.find((c) => c.leagueLevel === 4)!;
let save: CareerSave = {
  version: 1,
  seed: Number(process.argv[2] ?? '77'),
  create: { name: 'Diego Trovato', nationality: 'Italy', role: 'FWD', age: 14, leagueLevel: 4 },
  startClubId: start.club.id,
  decisions: {
    training: {}, dilemmas: {}, transfers: {},
    modo: 'classica', ambizione: 'bandiera', position: 'ST', style: 'equilibrato',
    look: { pelle: 2, capelli: 1, espressione: 1, divisa: 1, scarpini: 2 }, numero: '9',
  },
};

let stato = playCareer(save, clubs);
for (let passi = 0; passi < 500 && !stato.finished; passi += 1) {
  const p = stato.pending;
  if (p === null) break;
  const d = { ...save.decisions };
  if (p.kind === 'agent') d.agentId = p.options[0]!.id;
  else if (p.kind === 'youth') d.youth = { ...d.youth, [String(p.year)]: 'forza-il-ritmo' };
  else if (p.kind === 'promotion') d.promotedAt = stato.youth.length;
  else if (p.kind === 'training') d.training = { ...d.training, [String(p.season)]: 'tecnica' };
  else if (p.kind === 'dilemma') {
    d.dilemmas = { ...d.dilemmas, [decisionKey(p.season, p.dilemma.id)]: p.dilemma.options[0]!.id };
  } else d.transfers = { ...d.transfers, [String(p.season)]: 'resta' };
  save = { ...save, decisions: d };
  stato = playCareer(save, clubs);
}

console.log(`stagioni ${stato.seasons.length} · GOAT ${stato.result?.goat.total} · club ${stato.result?.clubsPlayed.join(', ')}`);
console.log(encodeSave(save));
