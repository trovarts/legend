/**
 * Trasforma il CSV grezzo di EA FC 26 nei bundle JSON del gioco.
 * Il CSV resta fuori da public/: al browser arrivano solo i bundle.
 * Uso: npm run import:world
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leagueIdOf, toLevel, toRole } from '../src/world/importMapping';
import type { Club, LeagueBundle, LeagueSummary, WorldPlayer } from '../src/world/types';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'data/raw/fc26-players.csv');
const OUT_DIR = join(ROOT, 'public/world');
const MIN_CLUBS_PER_LEAGUE = 6;

/** Parser CSV minimale: gestisce le virgolette e le virgole dentro i campi. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(field); field = ''; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (char === '\r') continue;
    field += char;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function mostFrequent(values: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = '';
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) { best = value; bestCount = count; }
  }
  return best;
}

function main(): void {
  const rows = parseCsv(readFileSync(SOURCE, 'utf8'));
  const header = rows[0];
  if (!header) throw new Error('CSV vuoto');
  const col = (name: string): number => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`colonna mancante nel CSV: ${name}`);
    return index;
  };

  const C = {
    playerId: col('player_id'), name: col('short_name'), age: col('age'),
    positions: col('player_positions'), overall: col('overall'), potential: col('potential'),
    value: col('value_eur'), nationality: col('nationality_name'),
    leagueId: col('league_id'), leagueName: col('league_name'), leagueLevel: col('league_level'),
    clubId: col('club_team_id'), clubName: col('club_name'),
  };

  interface Accumulator {
    summary: Omit<LeagueSummary, 'country' | 'clubCount'>;
    clubs: Map<string, Club>;
    nationalities: string[];
  }
  const leagues = new Map<string, Accumulator>();

  for (const row of rows.slice(1)) {
    const leagueName = row[C.leagueName] ?? '';
    const clubName = row[C.clubName] ?? '';
    if (leagueName === '' || clubName === '') continue;

    const id = leagueIdOf(leagueName, row[C.leagueId] ?? '0');
    let league = leagues.get(id);
    if (!league) {
      league = {
        summary: { id, name: leagueName, level: toLevel(row[C.leagueLevel] ?? '') },
        clubs: new Map(),
        nationalities: [],
      };
      leagues.set(id, league);
    }

    const clubId = `c${row[C.clubId] ?? '0'}`;
    let club = league.clubs.get(clubId);
    if (!club) { club = { id: clubId, name: clubName, squad: [] }; league.clubs.set(clubId, club); }

    const player: WorldPlayer = {
      id: `p${row[C.playerId] ?? '0'}`,
      name: row[C.name] ?? 'Sconosciuto',
      age: Math.round(Number(row[C.age] ?? '25')),
      role: toRole(row[C.positions] ?? ''),
      overall: Math.round(Number(row[C.overall] ?? '50')),
      potential: Math.round(Number(row[C.potential] ?? '50')),
      valueEur: Math.round(Number(row[C.value] ?? '0')),
      nationality: row[C.nationality] ?? '',
    };
    club.squad.push(player);
    league.nationalities.push(player.nationality);
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(join(OUT_DIR, 'leagues'), { recursive: true });
  const index: LeagueSummary[] = [];

  for (const [id, league] of leagues) {
    const clubs = [...league.clubs.values()].filter((club) => club.squad.length >= 11);
    // Sotto le sei squadre il dataset copre il campionato troppo male per giocarci.
    if (clubs.length < MIN_CLUBS_PER_LEAGUE) continue;
    const summary: LeagueSummary = {
      ...league.summary,
      country: mostFrequent(league.nationalities),
      clubCount: clubs.length,
    };
    const bundle: LeagueBundle = { league: summary, clubs };
    writeFileSync(join(OUT_DIR, 'leagues', `${id}.json`), JSON.stringify(bundle));
    index.push(summary);
  }

  index.sort((a, b) => a.country.localeCompare(b.country) || a.level - b.level);
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));

  const clubTotal = index.reduce((sum, league) => sum + league.clubCount, 0);
  console.log(`Campionati: ${index.length} | Club: ${clubTotal}`);
}

main();
