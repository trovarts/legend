# LEGGENDA — Fase 1: fondamenta e ciclo di vita del giocatore

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire il motore deterministico che, partendo dalle rose reali di EA FC 26, genera un calciatore, gli assegna i minuti in base alla concorrenza vera della sua squadra, lo fa crescere e declinare con l'età e lo porta al ritiro — verificabile da terminale con un Simulation Lab.

**Architecture:** Tre strati separati. `src/world/` espone il mondo dietro l'interfaccia `WorldSource`, alimentata da uno script di import che trasforma il CSV grezzo in bundle JSON per campionato. `src/engine/` è TypeScript puro e deterministico: prende `(stato, rng)` e restituisce nuovo stato, senza toccare rete, DOM o orologio. `scripts/lab.ts` gira migliaia di carriere e verifica le invarianti. Niente Next.js e niente interfaccia in questa fase: arrivano alla Fase 4.

**Tech Stack:** Node 24, TypeScript 5.9, vitest 3.2, tsx 4.20. Nessuna dipendenza di runtime.

**Spec:** `docs/specs/2026-08-28-leggenda-v1-design.md`

## Global Constraints

- **Determinismo assoluto** (spec §5.1): dentro `src/engine/` sono vietati `Math.random()`, `Date.now()`, `new Date()`. La casualità arriva solo da un `Rng` passato come argomento. Un test dedicato verifica che stesso seed produca la stessa identica carriera.
- **Il motore non conosce la fonte dati** (spec §4.2): `src/engine/` non importa mai da `src/world/fileSource.ts` né legge file. Riceve i dati già caricati. È la condizione che rende sostituibile il database.
- **Il dato grezzo non arriva mai al browser** (spec §4.3): `data/raw/fc26-players.csv` resta fuori da `public/`.
- **Funzioni pure**: le funzioni del motore non mutano gli argomenti, restituiscono nuovi oggetti.
- **Lingua**: identificatori e codice in inglese, testi di gioco e commenti in italiano (spec §8: V1 solo in italiano).
- **Node 24.18.0**, npm 11.16.0, ESM (`"type": "module"`), import con estensione `.js`.
- **Un commit per task**, messaggio in italiano, prefisso convenzionale (`feat:`, `test:`, `chore:`).

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts` | Impalcatura, script npm |
| `scripts/import-world.ts` | CSV grezzo → bundle JSON per campionato |
| `src/world/types.ts` | Tipi del mondo: `Role`, `WorldPlayer`, `Club`, `LeagueSummary`, `LeagueBundle` |
| `src/world/source.ts` | Interfaccia `WorldSource` — l'unico punto di contatto col database |
| `src/world/fileSource.ts` | Implementazione da filesystem, per test e Simulation Lab |
| `src/engine/rng.ts` | Generatore pseudocasuale seedato |
| `src/engine/types.ts` | Tipi della carriera: `CareerPlayer`, `SeasonRecord`, `CareerResult` |
| `src/engine/create.ts` | Generazione del giocatore iniziale |
| `src/engine/playingTime.ts` | Quota di minuti dalla concorrenza reale in rosa |
| `src/engine/growth.ts` | Crescita verso il potenziale, declino dopo il picco |
| `src/engine/retirement.ts` | Decisione di ritiro |
| `src/engine/career.ts` | Ciclo completo: dalla creazione al ritiro |
| `scripts/lab.ts` | Simulation Lab: migliaia di carriere + invarianti |

---

### Task 1: Impalcatura del progetto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: comandi `npm test`, `npm run typecheck`

- [ ] **Step 1: Creare `package.json`**

```json
{
  "name": "leggenda",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.0.0" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "import:world": "tsx scripts/import-world.ts",
    "lab": "tsx scripts/lab.ts",
    "check": "npm run typecheck && npm run test"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Creare `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "scripts", "tests"]
}
```

`noUncheckedIndexedAccess` è acceso di proposito: il motore indicizza array e mappe di continuo, e questa opzione forza a gestire il caso "manca".

- [ ] **Step 3: Creare `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Creare `.gitignore`**

```
node_modules/
public/world/
*.tsbuildinfo
.DS_Store
```

`public/world/` è generato dallo script di import: non si versiona.

- [ ] **Step 5: Scrivere il test smoke**

`tests/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('impalcatura', () => {
  it('esegue i test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Installare ed eseguire**

Run: `npm install && npm test`
Expected: 1 test passato.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore tests/smoke.test.ts
git commit -m "chore: impalcatura del progetto con vitest e typescript"
```

---

### Task 2: Generatore pseudocasuale deterministico

Il pezzo su cui poggia tutto: senza determinismo non esistono né il salvataggio a seed (spec §5.4) né il Simulation Lab (spec §6).

**Files:**
- Create: `src/engine/rng.ts`
- Test: `tests/engine/rng.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: `createRng(seed: number): Rng` dove `Rng = { next(): number; int(min: number, max: number): number; chance(p: number): boolean; pick<T>(items: readonly T[]): T }`

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng.js';

describe('createRng', () => {
  it('produce la stessa sequenza per lo stesso seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('produce sequenze diverse per seed diversi', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() resta dentro [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int() rispetta gli estremi, inclusi', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const value = rng.int(3, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6]));
  });

  it('int() con estremi uguali restituisce quel valore', () => {
    const rng = createRng(5);
    expect(rng.int(4, 4)).toBe(4);
  });

  it('chance(0) è sempre falso e chance(1) è sempre vero', () => {
    const rng = createRng(11);
    for (let i = 0; i < 100; i += 1) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('chance(0.5) si avvicina alla metà su molti tiri', () => {
    const rng = createRng(2026);
    let hits = 0;
    for (let i = 0; i < 10_000; i += 1) {
      if (rng.chance(0.5)) hits += 1;
    }
    expect(hits).toBeGreaterThan(4700);
    expect(hits).toBeLessThan(5300);
  });

  it('pick() restituisce un elemento della lista', () => {
    const rng = createRng(3);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i += 1) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('pick() su lista vuota lancia un errore', () => {
    const rng = createRng(3);
    expect(() => rng.pick([])).toThrow('lista vuota');
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/rng.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/engine/rng.js"`

- [ ] **Step 3: Implementare**

`src/engine/rng.ts`:

```ts
/**
 * Generatore pseudocasuale deterministico (mulberry32).
 * Il motore non usa mai Math.random(): tutta la casualità passa da qui,
 * così una carriera si può rigiocare identica dal suo seed.
 */
export interface Rng {
  /** Numero in [0, 1). */
  next(): number;
  /** Intero fra min e max, estremi inclusi. */
  int(min: number, max: number): number;
  /** Vero con probabilità p (fuori da [0,1] viene troncato). */
  chance(p: number): boolean;
  /** Un elemento a caso della lista. */
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  const chance = (p: number): boolean => {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return next() < p;
  };

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('pick(): lista vuota');
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new Error('pick(): indice fuori dalla lista');
    return item;
  };

  return { next, int, chance, pick };
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/rng.test.ts`
Expected: 9 test passati.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts tests/engine/rng.test.ts
git commit -m "feat: generatore pseudocasuale deterministico seedato"
```

---

### Task 3: Import del mondo dal dataset reale

Trasforma `data/raw/fc26-players.csv` (18.405 giocatori, 662 club, 42 campionati) nei bundle JSON che il gioco caricherà.

Fatti sul dataset, già verificati — non serve rianalizzarlo:
- Colonne usate: `player_id`, `short_name`, `age`, `player_positions`, `overall`, `potential`, `value_eur`, `nationality_name`, `league_id`, `league_name`, `league_level`, `club_team_id`, `club_name`.
- Nessun valore mancante su `potential` e `value_eur`.
- `league_name` **non è univoco** fra paesi diversi: la chiave affidabile è `league_id`.
- Il dataset non contiene la nazione del campionato: si deduce dalla nazionalità più frequente fra i suoi giocatori.
- `league_level` arriva come `"1.0"`, `"2.0"`, `"3.0"`, `"4.0"` — va convertito con `Math.round(Number(...))`.

**Files:**
- Create: `src/world/types.ts`, `src/world/importMapping.ts`, `scripts/import-world.ts`
- Test: `tests/world/importMapping.test.ts`

**Interfaces:**
- Consumes: `createRng` (non usato qui)
- Produces:
  - `src/world/types.ts`: `Role`, `WorldPlayer`, `Club`, `LeagueSummary`, `LeagueBundle`
  - `src/world/importMapping.ts`: `toRole(positions: string): Role`, `slugify(text: string): string`, `leagueIdOf(leagueName: string, leagueId: string): string`, `toLevel(raw: string): number`
  - Output su disco: `public/world/index.json` (`LeagueSummary[]`) e `public/world/leagues/<leagueId>.json` (`LeagueBundle`)

- [ ] **Step 1: Creare i tipi del mondo**

`src/world/types.ts`:

```ts
/** Famiglia di ruolo. Il punteggio finale è normalizzato su queste quattro (spec §3.7). */
export type Role = 'GK' | 'DEF' | 'MID' | 'FWD';

/** Un calciatore del mondo di gioco (compagno, avversario, concorrente per il posto). */
export interface WorldPlayer {
  id: string;
  name: string;
  age: number;
  role: Role;
  overall: number;
  potential: number;
  valueEur: number;
  nationality: string;
}

export interface Club {
  id: string;
  name: string;
  squad: WorldPlayer[];
}

export interface LeagueSummary {
  /** Slug univoco, es. "serie-a-31". */
  id: string;
  name: string;
  /** Dedotta dalla nazionalità più frequente in rosa. */
  country: string;
  /** 1 = massima serie, fino a 4. */
  level: number;
  clubCount: number;
}

export interface LeagueBundle {
  league: LeagueSummary;
  clubs: Club[];
}
```

- [ ] **Step 2: Scrivere i test della mappatura**

`tests/world/importMapping.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { leagueIdOf, slugify, toLevel, toRole } from '../../src/world/importMapping.js';

describe('toRole', () => {
  it('mappa il portiere', () => {
    expect(toRole('GK')).toBe('GK');
  });

  it('mappa i difensori', () => {
    for (const p of ['CB', 'LB', 'RB', 'LWB', 'RWB']) {
      expect(toRole(p)).toBe('DEF');
    }
  });

  it('mappa i centrocampisti', () => {
    for (const p of ['CDM', 'CM', 'CAM', 'LM', 'RM']) {
      expect(toRole(p)).toBe('MID');
    }
  });

  it('mappa gli attaccanti', () => {
    for (const p of ['ST', 'CF', 'LW', 'RW']) {
      expect(toRole(p)).toBe('FWD');
    }
  });

  it('usa la prima posizione quando ce ne sono più di una', () => {
    expect(toRole('CM, CAM, RM')).toBe('MID');
    expect(toRole('ST,LW')).toBe('FWD');
  });

  it('tratta gli spazi e il minuscolo', () => {
    expect(toRole('  st ')).toBe('FWD');
  });

  it('su posizione sconosciuta ripiega su MID', () => {
    expect(toRole('XYZ')).toBe('MID');
    expect(toRole('')).toBe('MID');
  });
});

describe('slugify', () => {
  it('minuscolo con trattini', () => {
    expect(slugify('Serie A')).toBe('serie-a');
    expect(slugify('La Liga 2')).toBe('la-liga-2');
  });

  it('toglie gli accenti', () => {
    expect(slugify('Liga Profesional de Fútbol')).toBe('liga-profesional-de-futbol');
    expect(slugify('3. Liga')).toBe('3-liga');
  });

  it('non lascia trattini agli estremi', () => {
    expect(slugify('  Premier League  ')).toBe('premier-league');
  });
});

describe('leagueIdOf', () => {
  it('unisce slug e id numerico, perché i nomi non sono univoci', () => {
    expect(leagueIdOf('Serie A', '31')).toBe('serie-a-31');
    expect(leagueIdOf('Super League', '68')).toBe('super-league-68');
  });
});

describe('toLevel', () => {
  it('converte i livelli scritti come decimali', () => {
    expect(toLevel('1.0')).toBe(1);
    expect(toLevel('4.0')).toBe(4);
    expect(toLevel('2')).toBe(2);
  });

  it('su valore mancante ripiega su 1', () => {
    expect(toLevel('')).toBe(1);
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/world/importMapping.test.ts`
Expected: FAIL — modulo `importMapping.js` non trovato.

- [ ] **Step 4: Implementare la mappatura**

`src/world/importMapping.ts`:

```ts
import type { Role } from './types.js';

const ROLE_BY_POSITION: Record<string, Role> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  ST: 'FWD', CF: 'FWD', LW: 'FWD', RW: 'FWD',
};

/** Il dataset elenca più posizioni ("CM, CAM"): vale la prima. */
export function toRole(positions: string): Role {
  const first = positions.split(',')[0]?.trim().toUpperCase() ?? '';
  return ROLE_BY_POSITION[first] ?? 'MID';
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** I nomi dei campionati si ripetono fra paesi: l'id numerico li disambigua. */
export function leagueIdOf(leagueName: string, leagueId: string): string {
  return `${slugify(leagueName)}-${leagueId}`;
}

export function toLevel(raw: string): number {
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && value >= 1 ? value : 1;
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/world/importMapping.test.ts`
Expected: 13 test passati.

- [ ] **Step 6: Scrivere lo script di import**

`scripts/import-world.ts`:

```ts
/**
 * Trasforma il CSV grezzo di EA FC 26 nei bundle JSON del gioco.
 * Il CSV resta fuori da public/: al browser arrivano solo i bundle.
 * Uso: npm run import:world
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leagueIdOf, toLevel, toRole } from '../src/world/importMapping.js';
import type { Club, LeagueBundle, LeagueSummary, WorldPlayer } from '../src/world/types.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'data/raw/fc26-players.csv');
const OUT_DIR = join(ROOT, 'public/world');

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

  mkdirSync(join(OUT_DIR, 'leagues'), { recursive: true });
  const index: LeagueSummary[] = [];

  for (const [id, league] of leagues) {
    const clubs = [...league.clubs.values()].filter((club) => club.squad.length >= 11);
    if (clubs.length < 4) continue;
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
```

- [ ] **Step 7: Eseguire l'import e controllare l'esito**

Run: `npm run import:world`
Expected: stampa `Campionati: 42 | Club: ~662` (qualche club sotto gli 11 giocatori viene scartato: è previsto).

Poi verificare a occhio che le nazioni dedotte siano sensate:

Run: `node -e "const l=require('./public/world/index.json');console.log(l.slice(0,12).map(x=>x.country+' | '+x.name+' lv'+x.level).join('\n'))"`

Se una nazione risulta palesemente sbagliata, **non** correggerla a mano nel JSON (è generato): aggiungere una tabella di override in `scripts/import-world.ts`, applicata dopo `mostFrequent`.

- [ ] **Step 8: Commit**

```bash
git add src/world/types.ts src/world/importMapping.ts scripts/import-world.ts tests/world/importMapping.test.ts
git commit -m "feat: import del mondo dal dataset EA FC 26 in bundle per campionato"
```

---

### Task 4: `WorldSource` e implementazione da filesystem

**Files:**
- Create: `src/world/source.ts`, `src/world/fileSource.ts`
- Test: `tests/world/fileSource.test.ts`

**Interfaces:**
- Consumes: `LeagueBundle`, `LeagueSummary` da `src/world/types.ts`
- Produces:
  - `WorldSource` = `{ listLeagues(): Promise<LeagueSummary[]>; loadLeague(leagueId: string): Promise<LeagueBundle> }`
  - `createFileWorldSource(rootDir: string): WorldSource`

- [ ] **Step 1: Definire l'interfaccia**

`src/world/source.ts`:

```ts
import type { LeagueBundle, LeagueSummary } from './types.js';

/**
 * L'unico punto di contatto fra il gioco e il database del mondo.
 * Il motore non sa se dietro c'è EA FC 26, un file della community o dati inventati:
 * è questo che rende il database sostituibile (spec §4.2).
 */
export interface WorldSource {
  listLeagues(): Promise<LeagueSummary[]>;
  loadLeague(leagueId: string): Promise<LeagueBundle>;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/world/fileSource.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFileWorldSource } from '../../src/world/fileSource.js';

const source = createFileWorldSource('public/world');

describe('createFileWorldSource', () => {
  it('elenca i campionati importati', async () => {
    const leagues = await source.listLeagues();
    expect(leagues.length).toBeGreaterThan(30);
    const first = leagues[0];
    expect(first).toBeDefined();
    expect(typeof first?.id).toBe('string');
    expect(first?.level).toBeGreaterThanOrEqual(1);
  });

  it('carica un campionato con club e rose', async () => {
    const leagues = await source.listLeagues();
    const serieA = leagues.find((league) => league.name === 'Serie A' && league.level === 1);
    expect(serieA).toBeDefined();

    const bundle = await source.loadLeague(serieA!.id);
    expect(bundle.clubs.length).toBeGreaterThan(15);

    const napoli = bundle.clubs.find((club) => club.name === 'Napoli');
    expect(napoli).toBeDefined();
    expect(napoli!.squad.length).toBeGreaterThan(20);
    expect(napoli!.squad.some((player) => player.role === 'GK')).toBe(true);
  });

  it('mette in cache: due caricamenti restituiscono lo stesso oggetto', async () => {
    const leagues = await source.listLeagues();
    const id = leagues[0]!.id;
    const a = await source.loadLeague(id);
    const b = await source.loadLeague(id);
    expect(a).toBe(b);
  });

  it('su campionato inesistente lancia un errore leggibile', async () => {
    await expect(source.loadLeague('non-esiste-0')).rejects.toThrow('campionato non trovato');
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/world/fileSource.test.ts`
Expected: FAIL — modulo `fileSource.js` non trovato.

- [ ] **Step 4: Implementare**

`src/world/fileSource.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WorldSource } from './source.js';
import type { LeagueBundle, LeagueSummary } from './types.js';

/** Sorgente da filesystem: serve ai test e al Simulation Lab. Nel browser userà fetch. */
export function createFileWorldSource(rootDir: string): WorldSource {
  let indexCache: LeagueSummary[] | undefined;
  const leagueCache = new Map<string, LeagueBundle>();

  return {
    async listLeagues(): Promise<LeagueSummary[]> {
      if (!indexCache) {
        const raw = await readFile(join(rootDir, 'index.json'), 'utf8');
        indexCache = JSON.parse(raw) as LeagueSummary[];
      }
      return indexCache;
    },

    async loadLeague(leagueId: string): Promise<LeagueBundle> {
      const cached = leagueCache.get(leagueId);
      if (cached) return cached;
      let raw: string;
      try {
        raw = await readFile(join(rootDir, 'leagues', `${leagueId}.json`), 'utf8');
      } catch {
        throw new Error(`campionato non trovato: ${leagueId}`);
      }
      const bundle = JSON.parse(raw) as LeagueBundle;
      leagueCache.set(leagueId, bundle);
      return bundle;
    },
  };
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/world/fileSource.test.ts`
Expected: 4 test passati. Se falliscono per file mancante, eseguire prima `npm run import:world`.

- [ ] **Step 6: Commit**

```bash
git add src/world/source.ts src/world/fileSource.ts tests/world/fileSource.test.ts
git commit -m "feat: WorldSource e implementazione da filesystem con cache"
```

---

### Task 5: Creazione del giocatore

**Files:**
- Create: `src/engine/types.ts`, `src/engine/create.ts`
- Test: `tests/engine/create.test.ts`

**Interfaces:**
- Consumes: `Rng` da `src/engine/rng.js`, `Role` da `src/world/types.js`
- Produces:
  - `CareerPlayer` = `{ name: string; nationality: string; role: Role; age: number; overall: number; potential: number; physique: number; peakAge: number; seasonsPlayed: number; retired: boolean }`
  - `SeasonRecord`, `CareerResult` (usati dai Task 9 e 10)
  - `createPlayer(input: CreatePlayerInput, rng: Rng): CareerPlayer`
  - `CreatePlayerInput` = `{ name: string; nationality: string; role: Role; age: number; leagueLevel: number }`

Regole di bilanciamento fissate (spec §3.1 e §3.3):

| Livello del campionato di partenza | OVR base |
|---|---|
| 1 | 55 |
| 2 | 52 |
| 3 | 49 |
| 4 o più | 46 |

OVR iniziale = base + `rng.int(-2, 3)`. Potenziale = OVR + `rng.int(8, 30)`, mai oltre 94. Fisico = `rng.int(40, 85)`. Età del picco = `26 + floor(fisico / 25)`, cioè fra 27 e 29.

- [ ] **Step 1: Creare i tipi della carriera**

`src/engine/types.ts`:

```ts
import type { Role } from '../world/types.js';

/** Il giocatore dell'utente. Il potenziale non viene mai mostrato come numero (spec §3.1). */
export interface CareerPlayer {
  name: string;
  nationality: string;
  role: Role;
  age: number;
  overall: number;
  potential: number;
  /** 1-99: resistenza all'età e agli infortuni. Sposta l'età del picco. */
  physique: number;
  peakAge: number;
  seasonsPlayed: number;
  retired: boolean;
}

/** Una riga della timeline di carriera. La Fase 2 aggiungerà gol, assist e trofei. */
export interface SeasonRecord {
  season: number;
  age: number;
  clubId: string;
  clubName: string;
  leagueId: string;
  minutesShare: number;
  overallStart: number;
  overallEnd: number;
}

export interface CareerResult {
  player: CareerPlayer;
  seasons: SeasonRecord[];
  peakOverall: number;
  retiredAt: number;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/create.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/engine/create.js';
import { createRng } from '../../src/engine/rng.js';

const base = { name: 'Diego', nationality: 'Italy', role: 'FWD' as const, age: 17 };

describe('createPlayer', () => {
  it("conserva i dati scelti dall'utente", () => {
    const player = createPlayer({ ...base, leagueLevel: 1 }, createRng(1));
    expect(player.name).toBe('Diego');
    expect(player.nationality).toBe('Italy');
    expect(player.role).toBe('FWD');
    expect(player.age).toBe(17);
    expect(player.seasonsPlayed).toBe(0);
    expect(player.retired).toBe(false);
  });

  it('parte più forte in prima divisione che in quarta', () => {
    let firstTotal = 0;
    let fourthTotal = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      firstTotal += createPlayer({ ...base, leagueLevel: 1 }, createRng(seed)).overall;
      fourthTotal += createPlayer({ ...base, leagueLevel: 4 }, createRng(seed)).overall;
    }
    expect(firstTotal / 200).toBeGreaterThan(fourthTotal / 200 + 6);
  });

  it("il potenziale è sempre sopra l'overall e non supera 94", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const player = createPlayer({ ...base, leagueLevel: 2 }, createRng(seed));
      expect(player.potential).toBeGreaterThan(player.overall);
      expect(player.potential).toBeLessThanOrEqual(94);
    }
  });

  it('il picco cade fra i 27 e i 29 anni', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const player = createPlayer({ ...base, leagueLevel: 1 }, createRng(seed));
      expect(player.peakAge).toBeGreaterThanOrEqual(27);
      expect(player.peakAge).toBeLessThanOrEqual(29);
    }
  });

  it('è deterministico: stesso seed, stesso giocatore', () => {
    const a = createPlayer({ ...base, leagueLevel: 3 }, createRng(77));
    const b = createPlayer({ ...base, leagueLevel: 3 }, createRng(77));
    expect(a).toEqual(b);
  });

  it('un livello sconosciuto ricade sul più basso', () => {
    const deep = createPlayer({ ...base, leagueLevel: 9 }, createRng(4));
    const fourth = createPlayer({ ...base, leagueLevel: 4 }, createRng(4));
    expect(deep.overall).toBe(fourth.overall);
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/create.test.ts`
Expected: FAIL — modulo `create.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/create.ts`:

```ts
import type { Role } from '../world/types.js';
import type { Rng } from './rng.js';
import type { CareerPlayer } from './types.js';

export interface CreatePlayerInput {
  name: string;
  nationality: string;
  role: Role;
  /** 16-19 alla creazione. */
  age: number;
  /** Livello del campionato in cui si comincia: 1 = massima serie. */
  leagueLevel: number;
}

/** Partire in basso significa partire più deboli — ma con più spazio per giocare (spec §3.1). */
const BASE_OVERALL_BY_LEVEL: Record<number, number> = { 1: 55, 2: 52, 3: 49, 4: 46 };
const MAX_POTENTIAL = 94;

export function createPlayer(input: CreatePlayerInput, rng: Rng): CareerPlayer {
  const base = BASE_OVERALL_BY_LEVEL[input.leagueLevel] ?? BASE_OVERALL_BY_LEVEL[4]!;
  const overall = base + rng.int(-2, 3);
  const potential = Math.min(MAX_POTENTIAL, overall + rng.int(8, 30));
  const physique = rng.int(40, 85);

  return {
    name: input.name,
    nationality: input.nationality,
    role: input.role,
    age: input.age,
    overall,
    potential,
    physique,
    peakAge: 26 + Math.floor(physique / 25),
    seasonsPlayed: 0,
    retired: false,
  };
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/create.test.ts`
Expected: 6 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/create.ts tests/engine/create.test.ts
git commit -m "feat: creazione del giocatore con potenziale nascosto ed eta del picco"
```

---

### Task 6: Minuti giocati dalla concorrenza reale

Il sistema che dà senso alla scelta del club: in una big non giochi, e chi non gioca non cresce (spec §3.3).

**Files:**
- Create: `src/engine/playingTime.ts`
- Test: `tests/engine/playingTime.test.ts`

**Interfaces:**
- Consumes: `Role`, `WorldPlayer` da `src/world/types.js`
- Produces: `playingTimeShare(overall: number, role: Role, squad: readonly WorldPlayer[]): number` — quota di minuti fra 0.02 e 0.95

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/playingTime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { playingTimeShare } from '../../src/engine/playingTime.js';
import type { Role, WorldPlayer } from '../../src/world/types.js';

function squadOf(role: Role, overalls: readonly number[]): WorldPlayer[] {
  return overalls.map((overall, index) => ({
    id: `p${index}`,
    name: `Giocatore ${index}`,
    age: 26,
    role,
    overall,
    potential: overall,
    valueEur: 1_000_000,
    nationality: 'Italy',
  }));
}

describe('playingTimeShare', () => {
  it('il migliore del reparto gioca quasi sempre', () => {
    const share = playingTimeShare(85, 'FWD', squadOf('FWD', [70, 72, 68]));
    expect(share).toBeGreaterThan(0.85);
  });

  it("il quinto attaccante di una big non gioca", () => {
    const share = playingTimeShare(60, 'FWD', squadOf('FWD', [88, 86, 84, 82, 80]));
    expect(share).toBeLessThan(0.15);
  });

  it('lo stesso giocatore gioca di più in una squadra debole', () => {
    const strong = playingTimeShare(70, 'MID', squadOf('MID', [85, 84, 83, 82, 80]));
    const weak = playingTimeShare(70, 'MID', squadOf('MID', [64, 62, 60, 58]));
    expect(weak).toBeGreaterThan(strong + 0.3);
  });

  it('conta solo i concorrenti dello stesso ruolo', () => {
    const mixed: WorldPlayer[] = [...squadOf('FWD', [90, 90, 90]), ...squadOf('GK', [60])];
    expect(playingTimeShare(70, 'GK', mixed)).toBeGreaterThan(0.85);
  });

  it("il secondo portiere gioca poco: davanti c'è un solo posto", () => {
    const share = playingTimeShare(70, 'GK', squadOf('GK', [80]));
    expect(share).toBeLessThan(0.4);
    expect(share).toBeGreaterThan(0.2);
  });

  it('resta sempre dentro i limiti', () => {
    const crowded = squadOf('DEF', [95, 94, 93, 92, 91, 90, 89, 88, 87, 86]);
    expect(playingTimeShare(40, 'DEF', crowded)).toBeGreaterThanOrEqual(0.02);
    expect(playingTimeShare(99, 'DEF', [])).toBeLessThanOrEqual(0.95);
  });

  it('senza concorrenti in rosa gioca al massimo', () => {
    expect(playingTimeShare(50, 'MID', [])).toBeGreaterThan(0.85);
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/playingTime.test.ts`
Expected: FAIL — modulo `playingTime.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/playingTime.ts`:

```ts
import type { Role, WorldPlayer } from '../world/types.js';

/** Posti da titolare per reparto: davanti a un portiere c'è un solo posto, davanti a un difensore quattro. */
const STARTING_SLOTS: Record<Role, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

const MIN_SHARE = 0.02;
const MAX_SHARE = 0.95;

/**
 * Quota di minuti stagionali, dal confronto con i concorrenti veri dello stesso ruolo.
 * È la valuta della carriera: chi non gioca non cresce (spec §3.3).
 */
export function playingTimeShare(
  overall: number,
  role: Role,
  squad: readonly WorldPlayer[],
): number {
  const slots = STARTING_SLOTS[role];
  const better = squad.filter(
    (player) => player.role === role && player.overall > overall,
  ).length;

  const share =
    better < slots
      ? 0.9 - better * 0.08
      : 0.45 - (better - slots + 1) * 0.12;

  return Math.min(MAX_SHARE, Math.max(MIN_SHARE, share));
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/playingTime.test.ts`
Expected: 7 test passati.

- [ ] **Step 5: Commit**

```bash
git add src/engine/playingTime.ts tests/engine/playingTime.test.ts
git commit -m "feat: minuti giocati calcolati sulla concorrenza reale in rosa"
```

---

### Task 7: Crescita e declino

**Files:**
- Create: `src/engine/growth.ts`
- Test: `tests/engine/growth.test.ts`

**Interfaces:**
- Consumes: `CareerPlayer` da `src/engine/types.js`, `Rng` da `src/engine/rng.js`
- Produces: `growPlayer(player: CareerPlayer, minutesShare: number, rng: Rng): CareerPlayer` — restituisce un nuovo giocatore con `age + 1`, `seasonsPlayed + 1` e overall aggiornato. Non muta l'argomento.

Regole (spec §3.3):

| Età | Fattore di crescita |
|---|---|
| ≤ 21 | 1.00 |
| 22-23 | 0.80 |
| 24-25 | 0.55 |
| 26-27 | 0.30 |
| 28-29 | 0.15 |
| ≥ 30 | 0 |

Guadagno = `round((potenziale − overall) × 0.30 × fattoreEtà × fattoreMinuti)`, con fattoreMinuti = `0.25 + 0.75 × quotaMinuti`.
Declino, solo oltre l'età del picco = `round((età − picco) × 0.5 × (1 − fisico/200))`, più 1 se la quota minuti è sotto 0.30.
Rumore stagionale: `rng.int(-1, 1)`. Overall finale limitato fra 1 e 99.

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/growth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { growPlayer } from '../../src/engine/growth.js';
import { createRng } from '../../src/engine/rng.js';
import type { CareerPlayer } from '../../src/engine/types.js';

function playerAt(age: number, overall: number, potential: number): CareerPlayer {
  return {
    name: 'Test', nationality: 'Italy', role: 'MID', age, overall, potential,
    physique: 60, peakAge: 28, seasonsPlayed: age - 17, retired: false,
  };
}

describe('growPlayer', () => {
  it('fa invecchiare di un anno e conta la stagione', () => {
    const before = playerAt(18, 55, 85);
    const after = growPlayer(before, 0.8, createRng(1));
    expect(after.age).toBe(19);
    expect(after.seasonsPlayed).toBe(before.seasonsPlayed + 1);
  });

  it('non muta il giocatore che riceve', () => {
    const before = playerAt(18, 55, 85);
    growPlayer(before, 0.8, createRng(1));
    expect(before.age).toBe(18);
    expect(before.overall).toBe(55);
  });

  it('un giovane titolare cresce parecchio', () => {
    const after = growPlayer(playerAt(18, 55, 85), 0.9, createRng(3));
    expect(after.overall).toBeGreaterThan(58);
  });

  it('chi non gioca cresce molto meno, a parità di talento', () => {
    const playing = growPlayer(playerAt(18, 55, 85), 0.9, createRng(5));
    const benched = growPlayer(playerAt(18, 55, 85), 0.05, createRng(5));
    expect(playing.overall).toBeGreaterThan(benched.overall + 3);
  });

  it('a 33 anni si cala', () => {
    const after = growPlayer(playerAt(33, 80, 90), 0.7, createRng(9));
    expect(after.overall).toBeLessThan(80);
  });

  it('non supera mai il proprio potenziale', () => {
    let player = playerAt(18, 60, 72);
    for (let season = 0; season < 12; season += 1) {
      player = growPlayer(player, 0.9, createRng(season));
      expect(player.overall).toBeLessThanOrEqual(player.potential);
    }
  });

  it("l'overall resta fra 1 e 99 anche in una carriera lunghissima", () => {
    let player = playerAt(16, 46, 94);
    for (let season = 0; season < 25; season += 1) {
      player = growPlayer(player, season % 3 === 0 ? 0.05 : 0.85, createRng(season));
      expect(player.overall).toBeGreaterThanOrEqual(1);
      expect(player.overall).toBeLessThanOrEqual(99);
    }
  });

  it('è deterministico', () => {
    const a = growPlayer(playerAt(20, 60, 88), 0.7, createRng(42));
    const b = growPlayer(playerAt(20, 60, 88), 0.7, createRng(42));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/growth.test.ts`
Expected: FAIL — modulo `growth.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/growth.ts`:

```ts
import type { Rng } from './rng.js';
import type { CareerPlayer } from './types.js';

/** Quanto si cresce a una certa età: sotto i 22 tutto, dopo i 30 niente. */
const GROWTH_BY_AGE: readonly (readonly [number, number])[] = [
  [21, 1.0],
  [23, 0.8],
  [25, 0.55],
  [27, 0.3],
  [29, 0.15],
];

function growthFactor(age: number): number {
  for (const [maxAge, factor] of GROWTH_BY_AGE) {
    if (age <= maxAge) return factor;
  }
  return 0;
}

function clampOverall(value: number, potential: number): number {
  return Math.min(99, Math.max(1, Math.min(value, potential)));
}

/**
 * Fa passare una stagione: crescita verso il potenziale, declino dopo il picco.
 * Restituisce un nuovo giocatore, non modifica quello ricevuto.
 */
export function growPlayer(
  player: CareerPlayer,
  minutesShare: number,
  rng: Rng,
): CareerPlayer {
  const playFactor = 0.25 + 0.75 * minutesShare;
  const gap = Math.max(0, player.potential - player.overall);
  const gain = Math.round(gap * 0.3 * growthFactor(player.age) * playFactor);

  const yearsPastPeak = Math.max(0, player.age - player.peakAge);
  const decline =
    yearsPastPeak > 0
      ? Math.round(yearsPastPeak * 0.5 * (1 - player.physique / 200)) +
        (minutesShare < 0.3 ? 1 : 0)
      : 0;

  const overall = clampOverall(
    player.overall + gain - decline + rng.int(-1, 1),
    player.potential,
  );

  return {
    ...player,
    age: player.age + 1,
    seasonsPlayed: player.seasonsPlayed + 1,
    overall,
  };
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/growth.test.ts`
Expected: 8 test passati.

- [ ] **Step 5: Commit**

```bash
git add src/engine/growth.ts tests/engine/growth.test.ts
git commit -m "feat: crescita verso il potenziale e declino dopo il picco"
```

---

### Task 8: Ritiro

**Files:**
- Create: `src/engine/retirement.ts`
- Test: `tests/engine/retirement.test.ts`

**Interfaces:**
- Consumes: `CareerPlayer`, `Rng`
- Produces: `shouldRetire(player: CareerPlayer, minutesShare: number, rng: Rng): boolean`

Regole (spec §3.3): sotto i 32 anni non ci si ritira mai; a 40 sempre. In mezzo la probabilità è
`(età − 31) × 0.08 + (0.25 − quotaMinuti) × 1.2 + (60 − overall) × 0.01`, troncata fra 0 e 1.

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/retirement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng.js';
import { shouldRetire } from '../../src/engine/retirement.js';
import type { CareerPlayer } from '../../src/engine/types.js';

function playerAt(age: number, overall: number): CareerPlayer {
  return {
    name: 'Test', nationality: 'Italy', role: 'DEF', age, overall, potential: 90,
    physique: 60, peakAge: 28, seasonsPlayed: age - 17, retired: false,
  };
}

function retirementRate(age: number, overall: number, share: number): number {
  let retired = 0;
  for (let seed = 0; seed < 1000; seed += 1) {
    if (shouldRetire(playerAt(age, overall), share, createRng(seed))) retired += 1;
  }
  return retired / 1000;
}

describe('shouldRetire', () => {
  it('sotto i 32 anni non ci si ritira mai', () => {
    for (let age = 18; age < 32; age += 1) {
      expect(retirementRate(age, 55, 0.05)).toBe(0);
    }
  });

  it('a 40 anni ci si ritira sempre', () => {
    expect(retirementRate(40, 88, 0.9)).toBe(1);
  });

  it('un titolare forte a 33 anni quasi non si ritira', () => {
    expect(retirementRate(33, 84, 0.9)).toBeLessThan(0.05);
  });

  it('una riserva a 35 anni si ritira spesso', () => {
    expect(retirementRate(35, 62, 0.05)).toBeGreaterThan(0.3);
  });

  it('più si invecchia, più è probabile', () => {
    expect(retirementRate(38, 70, 0.5)).toBeGreaterThan(retirementRate(34, 70, 0.5));
  });

  it('è deterministico', () => {
    const a = shouldRetire(playerAt(36, 70), 0.4, createRng(17));
    const b = shouldRetire(playerAt(36, 70), 0.4, createRng(17));
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/retirement.test.ts`
Expected: FAIL — modulo `retirement.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/retirement.ts`:

```ts
import type { Rng } from './rng.js';
import type { CareerPlayer } from './types.js';

const EARLIEST_RETIREMENT_AGE = 32;
const FORCED_RETIREMENT_AGE = 40;

/**
 * Si smette per età, per non giocare più, o perché non si è abbastanza forti.
 * La Fase 2 aggiungerà il peso degli infortuni e delle offerte ricevute (spec §3.3).
 */
export function shouldRetire(
  player: CareerPlayer,
  minutesShare: number,
  rng: Rng,
): boolean {
  if (player.age >= FORCED_RETIREMENT_AGE) return true;
  if (player.age < EARLIEST_RETIREMENT_AGE) return false;

  const probability =
    (player.age - 31) * 0.08 +
    (0.25 - minutesShare) * 1.2 +
    (60 - player.overall) * 0.01;

  return rng.chance(probability);
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/retirement.test.ts`
Expected: 6 test passati.

- [ ] **Step 5: Commit**

```bash
git add src/engine/retirement.ts tests/engine/retirement.test.ts
git commit -m "feat: decisione di ritiro per eta, minuti e livello"
```

---

### Task 9: La carriera completa

Mette insieme i pezzi: dalla creazione al ritiro, con la timeline delle stagioni. In questa fase il giocatore **resta nello stesso club** — mercato e trasferimenti sono Fase 2.

**Files:**
- Create: `src/engine/career.ts`
- Test: `tests/engine/career.test.ts`

**Interfaces:**
- Consumes: `createPlayer`, `playingTimeShare`, `growPlayer`, `shouldRetire`, `createRng`, `Club` da `src/world/types.js`
- Produces: `runCareer(input: RunCareerInput): CareerResult` con `RunCareerInput = { create: CreatePlayerInput; club: Club; leagueId: string; seed: number }`

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/career.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { runCareer } from '../../src/engine/career.js';
import type { CreatePlayerInput } from '../../src/engine/create.js';
import type { Club, WorldPlayer } from '../../src/world/types.js';

const create: CreatePlayerInput = {
  name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1,
};

function club(overalls: readonly number[]): Club {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `p${index}`, name: `Compagno ${index}`, age: 26, role: 'FWD',
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id: 'c1', name: 'Club di prova', squad };
}

describe('runCareer', () => {
  it('produce una carriera che finisce col ritiro', () => {
    const result = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 1 });
    expect(result.player.retired).toBe(true);
    expect(result.seasons.length).toBeGreaterThan(5);
    expect(result.retiredAt).toBe(result.player.age);
  });

  it("le stagioni sono numerate in ordine e l'età cresce di uno per volta", () => {
    const result = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 2 });
    result.seasons.forEach((season, index) => {
      expect(season.season).toBe(index + 1);
      expect(season.age).toBe(create.age + index);
    });
  });

  it('registra il club e il campionato in ogni stagione', () => {
    const result = runCareer({ create, club: club([70]), leagueId: 'serie-a-31', seed: 3 });
    for (const season of result.seasons) {
      expect(season.clubId).toBe('c1');
      expect(season.clubName).toBe('Club di prova');
      expect(season.leagueId).toBe('serie-a-31');
    }
  });

  it('il picco di overall è il massimo raggiunto nella carriera', () => {
    const result = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 4 });
    const maxFromSeasons = Math.max(...result.seasons.map((season) => season.overallEnd));
    expect(result.peakOverall).toBe(maxFromSeasons);
  });

  it('è deterministica: stesso seed, carriera identica', () => {
    const a = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 99 });
    const b = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 99 });
    expect(a).toEqual(b);
  });

  it('seed diversi danno carriere diverse', () => {
    const a = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 1 });
    const b = runCareer({ create, club: club([70, 68]), leagueId: 'serie-a-31', seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('in una squadra fortissima si gioca meno che in una debole', () => {
    const big = runCareer({ create, club: club([92, 90, 89, 88]), leagueId: 'x', seed: 7 });
    const small = runCareer({ create, club: club([58, 55]), leagueId: 'x', seed: 7 });
    const average = (values: readonly number[]): number =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average(small.seasons.map((s) => s.minutesShare)))
      .toBeGreaterThan(average(big.seasons.map((s) => s.minutesShare)));
  });

  it('non si ritira mai prima dei 30 anni', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const result = runCareer({ create, club: club([70, 68]), leagueId: 'x', seed });
      expect(result.retiredAt).toBeGreaterThanOrEqual(30);
      expect(result.retiredAt).toBeLessThanOrEqual(41);
    }
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/career.test.ts`
Expected: FAIL — modulo `career.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/career.ts`:

```ts
import type { Club } from '../world/types.js';
import { createPlayer, type CreatePlayerInput } from './create.js';
import { growPlayer } from './growth.js';
import { playingTimeShare } from './playingTime.js';
import { shouldRetire } from './retirement.js';
import { createRng } from './rng.js';
import type { CareerResult, SeasonRecord } from './types.js';

export interface RunCareerInput {
  create: CreatePlayerInput;
  club: Club;
  leagueId: string;
  seed: number;
}

/** Limite di sicurezza: nessuna carriera può girare all'infinito. */
const MAX_SEASONS = 30;

/**
 * Una carriera intera, dalla creazione al ritiro.
 * In Fase 1 il club non cambia mai: mercato e trasferimenti arrivano in Fase 2.
 */
export function runCareer(input: RunCareerInput): CareerResult {
  const rng = createRng(input.seed);
  let player = createPlayer(input.create, rng);
  const seasons: SeasonRecord[] = [];

  while (!player.retired && seasons.length < MAX_SEASONS) {
    const minutesShare = playingTimeShare(player.overall, player.role, input.club.squad);
    const overallStart = player.overall;
    const age = player.age;

    player = growPlayer(player, minutesShare, rng);

    seasons.push({
      season: seasons.length + 1,
      age,
      clubId: input.club.id,
      clubName: input.club.name,
      leagueId: input.leagueId,
      minutesShare,
      overallStart,
      overallEnd: player.overall,
    });

    if (shouldRetire(player, minutesShare, rng)) {
      player = { ...player, retired: true };
    }
  }

  if (!player.retired) player = { ...player, retired: true };

  return {
    player,
    seasons,
    peakOverall: seasons.reduce((peak, season) => Math.max(peak, season.overallEnd), 0),
    retiredAt: player.age,
  };
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/career.test.ts`
Expected: 8 test passati.

Se fallisce «non si ritira mai prima dei 30 anni» con un valore sopra 41, il colpevole è `MAX_SEASONS`: una carriera partita a 17 e lunga 30 stagioni arriverebbe a 47. Verificare che il ritiro forzato a 40 anni scatti prima.

- [ ] **Step 5: Commit**

```bash
git add src/engine/career.ts tests/engine/career.test.ts
git commit -m "feat: ciclo completo di carriera dalla creazione al ritiro"
```

---

### Task 10: Simulation Lab

Il guardiano del bilanciamento (spec §6): gira migliaia di carriere sui dati veri e verifica le invarianti. Da qui in avanti nessuna modifica al motore si considera finita se il Lab non è pulito.

**Files:**
- Create: `scripts/lab.ts`
- Modify: `package.json` (script `lab` già presente dal Task 1)

**Interfaces:**
- Consumes: `createFileWorldSource`, `runCareer`, `CareerResult`
- Produces: comando `npm run lab -- --careers=2000 --seed=42`

- [ ] **Step 1: Scrivere il Lab**

`scripts/lab.ts`:

```ts
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
```

- [ ] **Step 2: Eseguire il Lab**

Run: `npm run lab -- --careers=2000 --seed=42`
Expected: uscita con codice 0 e «Tutte le invarianti rispettate».

Se la durata media cade fuori da 12-24 stagioni, **non allargare la soglia**: correggere i parametri in `growth.ts` o `retirement.ts` e rieseguire. La soglia è il contratto con la spec (§6).

- [ ] **Step 3: Eseguire tutta la verifica**

Run: `npm run check`
Expected: typecheck pulito, tutti i test verdi.

- [ ] **Step 4: Commit**

```bash
git add scripts/lab.ts
git commit -m "feat: Simulation Lab con verifica delle invarianti di bilanciamento"
```

---

## Verifica finale della Fase 1

```bash
npm run import:world
npm run check
npm run lab -- --careers=5000 --seed=1
```

Tutti e tre devono uscire puliti. A quel punto la Fase 1 è chiusa e si può scrivere il piano della Fase 2 (stagione simulata con gol, assist, trofei, mercato e nazionale).

## Cosa NON si costruisce in questa fase

Interfaccia grafica, Next.js, gol e assist, trofei, mercato e trasferimenti, nazionale, il Rivale, i bivi, i Segni, il punteggio GOAT, il poster. Ognuno ha la sua fase. Aggiungerli qui significa consegnare una Fase 1 non verificabile.
