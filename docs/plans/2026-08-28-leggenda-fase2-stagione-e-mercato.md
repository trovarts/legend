# LEGGENDA — Fase 2: la stagione vera e il mercato

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare la carriera da "un overall che sale e scende" a una carriera vera: gol, assist, presenze e voto, la squadra che vince o retrocede, trofei e premi, il valore di mercato, le offerte che arrivano e il trasferimento che ti cambia la vita, più la nazionale.

**Architecture:** Ogni sistema è un modulo puro con la sua firma, orchestrato da `season.ts` che risolve una stagione intera. `career.ts` diventa un ciclo su `season.ts` con una `TransferPolicy` che decide dove andare — in Fase 4 quella policy sarà l'utente che clicca, qui è una funzione automatica che serve al Simulation Lab. Il motore resta deterministico e non tocca né file né rete.

**Tech Stack:** Node 24, TypeScript 5.9, vitest 3.2, tsx 4.20. Nessuna nuova dipendenza.

**Spec:** `docs/specs/2026-08-28-leggenda-v1-design.md` (§3.2, §3.3, §3.6, §5.1, §6)
**Fase precedente:** `docs/plans/2026-08-28-leggenda-fase1-fondamenta.md` — completata
**Decisioni già prese:** `docs/decisions.md` — leggere D-004 e D-005 prima di toccare il bilanciamento

## Global Constraints

- **Determinismo assoluto**: dentro `src/engine/` sono vietati `Math.random()`, `Date.now()`, `new Date()`. La casualità arriva solo dall'`Rng` passato come argomento.
- **Il motore non conosce la fonte dati**: `src/engine/` non importa mai da `src/world/fileSource.ts`. Riceve club e campionati già caricati.
- **Funzioni pure**: nessun modulo muta gli argomenti; si restituiscono nuovi oggetti.
- **Test sui dati veri, non su rose inventate** (lezione di D-005): ogni sistema che dipende dalle rose ha un test su `public/world` oltre a quelli su dati sintetici. I test su rose finte verificano la formula, quelli su rose vere verificano il gioco.
- **Il Lab è il guardiano**: `npm run lab` deve restare verde. Le due invarianti nuove di D-004 (riserve sotto il 15%, almeno l'1% delle carriere sopra 85 di picco) vanno attivate nel Task 12 e da lì in poi devono valere.
- **Lingua**: identificatori in inglese, testi di gioco e commenti in italiano.
- **Un commit per task**, messaggio in italiano.

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `src/engine/types.ts` | **modificare** — `SeasonStats`, `Trophy`, `Award`, `Offer`, `NationalSeason`, `SeasonRecord` arricchito |
| `src/engine/clubStrength.ts` | **nuovo** — forza di un club dalla sua rosa vera, posizione in classifica |
| `src/engine/stats.ts` | **nuovo** — presenze, minuti, gol, assist, clean sheet, voto |
| `src/engine/competitions.ts` | **nuovo** — campionato, coppa nazionale, coppa continentale |
| `src/engine/awards.ts` | **nuovo** — capocannoniere, MVP, miglior giovane |
| `src/engine/value.ts` | **nuovo** — valore di mercato e stipendio, tarati sui dati reali |
| `src/engine/market.ts` | **nuovo** — offerte in entrata e politica di trasferimento |
| `src/engine/national.ts` | **nuovo** — convocazioni, tornei internazionali |
| `src/engine/season.ts` | **nuovo** — orchestrazione di una stagione intera |
| `src/engine/career.ts` | **modificare** — ciclo su `season.ts`, cambio club, timeline arricchita |
| `scripts/lab.ts` | **modificare** — nuove statistiche e invarianti |

---

### Task 1: Forza del club e posizione in campionato

Tutto il resto poggia qui: gol, trofei, offerte e nazionale dipendono da quanto è forte la squadra in cui giochi e da come è andata la stagione.

**Files:**
- Create: `src/engine/clubStrength.ts`
- Test: `tests/engine/clubStrength.test.ts`, `tests/engine/clubStrengthReal.test.ts`

**Interfaces:**
- Consumes: `Club`, `WorldPlayer` da `src/world/types.js`, `Rng` da `src/engine/rng.js`
- Produces:
  - `clubStrength(club: Club): number` — media overall degli undici migliori, arrotondata a una cifra decimale
  - `clubStrengthWith(club: Club, playerOverall: number, playerRole: Role, minutesShare: number): number` — forza tenendo conto del giocatore, pesata sui minuti che gioca davvero
  - `leaguePosition(strength: number, allStrengths: readonly number[], rng: Rng): number` — posizione 1-based, con rumore stagionale

- [ ] **Step 1: Scrivere i test su dati sintetici**

`tests/engine/clubStrength.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clubStrength, clubStrengthWith, leaguePosition } from '../../src/engine/clubStrength.js';
import { createRng } from '../../src/engine/rng.js';
import type { Club, Role, WorldPlayer } from '../../src/world/types.js';

function club(overalls: readonly number[]): Club {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id: 'c1', name: 'Club', squad };
}

describe('clubStrength', () => {
  it('usa gli undici migliori, non tutta la rosa', () => {
    const eleven = Array.from({ length: 11 }, () => 80);
    const withBench = club([...eleven, 40, 40, 40, 40, 40]);
    expect(clubStrength(withBench)).toBe(80);
  });

  it('una rosa più corta di undici usa quello che ha', () => {
    expect(clubStrength(club([70, 70, 70]))).toBe(70);
  });

  it('una rosa vuota vale zero', () => {
    expect(clubStrength(club([]))).toBe(0);
  });
});

describe('clubStrengthWith', () => {
  it('un fuoriclasse titolare alza la squadra', () => {
    const base = club(Array.from({ length: 18 }, () => 70));
    const without = clubStrength(base);
    const withStar = clubStrengthWith(base, 92, 'FWD', 0.9);
    expect(withStar).toBeGreaterThan(without);
  });

  it('lo stesso fuoriclasse in panchina la alza molto meno', () => {
    const base = club(Array.from({ length: 18 }, () => 70));
    const starter = clubStrengthWith(base, 92, 'FWD', 0.9);
    const benched = clubStrengthWith(base, 92, 'FWD', 0.05);
    expect(starter).toBeGreaterThan(benched);
  });

  it('un giocatore scarso non abbassa la squadra se non gioca', () => {
    const base = club(Array.from({ length: 18 }, () => 80));
    expect(clubStrengthWith(base, 45, 'FWD', 0.02)).toBeCloseTo(clubStrength(base), 1);
  });
});

describe('leaguePosition', () => {
  const strengths = [82, 80, 78, 76, 74, 72, 70, 68, 66, 64];

  it('la squadra più forte finisce spesso prima', () => {
    let sum = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      sum += leaguePosition(82, strengths, createRng(seed));
    }
    expect(sum / 200).toBeLessThan(3);
  });

  it('la squadra più debole finisce spesso ultima', () => {
    let sum = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      sum += leaguePosition(64, strengths, createRng(seed));
    }
    expect(sum / 200).toBeGreaterThan(7.5);
  });

  it('la posizione resta dentro il campionato', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const position = leaguePosition(70, strengths, createRng(seed));
      expect(position).toBeGreaterThanOrEqual(1);
      expect(position).toBeLessThanOrEqual(strengths.length);
      expect(Number.isInteger(position)).toBe(true);
    }
  });

  it('esiste la sorpresa: la più forte non vince sempre', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 200; seed += 1) {
      positions.add(leaguePosition(82, strengths, createRng(seed)));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('è deterministico', () => {
    expect(leaguePosition(74, strengths, createRng(9))).toBe(
      leaguePosition(74, strengths, createRng(9)),
    );
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/clubStrength.test.ts`
Expected: FAIL — modulo `clubStrength.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/clubStrength.ts`:

```ts
import type { Club, Role } from '../world/types.js';
import type { Rng } from './rng.js';

const SQUAD_SIZE = 11;
/** Quanto la classifica si discosta dalla forza pura: senza sorprese non è calcio. */
const UPSET_SPREAD = 3.5;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Forza di una squadra: la media dei suoi undici migliori. */
export function clubStrength(club: Club): number {
  const best = [...club.squad]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, SQUAD_SIZE);
  if (best.length === 0) return 0;
  return round1(best.reduce((sum, player) => sum + player.overall, 0) / best.length);
}

/**
 * Forza della squadra tenendo conto del giocatore dell'utente, pesata sui minuti:
 * un fuoriclasse in panchina non sposta la classifica.
 */
export function clubStrengthWith(
  club: Club,
  playerOverall: number,
  playerRole: Role,
  minutesShare: number,
): number {
  const base = clubStrength(club);
  const others = [...club.squad]
    .filter((mate) => mate.role === playerRole)
    .sort((a, b) => b.overall - a.overall);
  const replaced = others[0]?.overall ?? base;
  const delta = ((playerOverall - replaced) / SQUAD_SIZE) * minutesShare;
  return round1(base + delta);
}

/**
 * Posizione finale in campionato: dalla forza, con il rumore di una stagione vera.
 * Le sorprese esistono, ma la squadra più forte resta favorita.
 */
export function leaguePosition(
  strength: number,
  allStrengths: readonly number[],
  rng: Rng,
): number {
  // allStrengths contiene anche il proprio club: va tolto, o ci si confronta con se stessi.
  const others = [...allStrengths];
  const self = others.indexOf(strength);
  if (self >= 0) others.splice(self, 1);

  const mine = strength + (rng.next() - 0.5) * 2 * UPSET_SPREAD;
  const better = others.filter(
    (value) => value + (rng.next() - 0.5) * 2 * UPSET_SPREAD > mine,
  ).length;
  return Math.min(others.length + 1, better + 1);
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/clubStrength.test.ts`
Expected: 10 test passati.

- [ ] **Step 5: Scrivere il test sulle rose vere**

`tests/engine/clubStrengthReal.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { clubStrength } from '../../src/engine/clubStrength.js';
import { createFileWorldSource } from '../../src/world/fileSource.js';
import type { Club } from '../../src/world/types.js';

describe('forza dei club veri', () => {
  let serieA: Club[];
  let serieB: Club[];

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const leagues = await source.listLeagues();
    const a = leagues.find((l) => l.name === 'Serie A' && l.country === 'Italy')!;
    const b = leagues.find((l) => l.name === 'Serie B' && l.country === 'Italy')!;
    serieA = (await source.loadLeague(a.id)).clubs;
    serieB = (await source.loadLeague(b.id)).clubs;
  });

  it('la Serie A è mediamente più forte della Serie B', () => {
    const average = (clubs: Club[]): number =>
      clubs.reduce((sum, club) => sum + clubStrength(club), 0) / clubs.length;
    expect(average(serieA)).toBeGreaterThan(average(serieB) + 3);
  });

  it('le forze stanno in un intervallo plausibile per il calcio vero', () => {
    for (const club of [...serieA, ...serieB]) {
      expect(clubStrength(club)).toBeGreaterThan(55);
      expect(clubStrength(club)).toBeLessThan(90);
    }
  });

  it('dentro la Serie A esiste un divario fra big e piccole', () => {
    const values = serieA.map(clubStrength).sort((a, b) => b - a);
    expect(values[0]! - values.at(-1)!).toBeGreaterThan(4);
  });
});
```

- [ ] **Step 6: Eseguire e verificare**

Run: `npx vitest run tests/engine/clubStrengthReal.test.ts`
Expected: 3 test passati. Se «la Serie A è più forte della Serie B» fallisce, il problema è nell'import dei dati, non qui: fermarsi e indagare.

- [ ] **Step 7: Commit**

```bash
git add src/engine/clubStrength.ts tests/engine/clubStrength.test.ts tests/engine/clubStrengthReal.test.ts
git commit -m "feat: forza dei club dalle rose vere e posizione in campionato"
```

---

### Task 2: Statistiche stagionali

I numeri che l'utente legge alla fine dell'anno. Devono essere plausibili per un tifoso: un attaccante forte titolare in Serie A fa 15-20 gol, non 45.

**Files:**
- Modify: `src/engine/types.ts` (aggiungere `SeasonStats`)
- Create: `src/engine/stats.ts`
- Test: `tests/engine/stats.test.ts`

**Interfaces:**
- Consumes: `Role`, `Rng`
- Produces:
  - `SeasonStats` = `{ appearances: number; minutes: number; goals: number; assists: number; cleanSheets: number; rating: number }`
  - `seasonStats(input: SeasonStatsInput, rng: Rng): SeasonStats`
  - `SeasonStatsInput` = `{ overall: number; role: Role; minutesShare: number; clubStrength: number; leagueLevel: number }`

Parametri di bilanciamento (gol attesi in una stagione piena, a overall 70, squadra media):

| Ruolo | Gol | Assist |
|---|---|---|
| FWD | 10 | 4 |
| MID | 4 | 6 |
| DEF | 1.5 | 2 |
| GK | 0 | 0 |

Il talento pesa al cubo: `(overall / 70) ** 3`. A 85 diventa 1,8 volte; a 90 diventa 2,1. Una stagione piena è **38 partite da 90 minuti** (3420 minuti).

- [ ] **Step 1: Aggiungere il tipo**

In `src/engine/types.ts`, aggiungere:

```ts
/** Quello che resta di una stagione sul tabellino. */
export interface SeasonStats {
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  /** Solo per portieri e difensori; zero per gli altri. */
  cleanSheets: number;
  /** Voto medio, fra 5.0 e 9.0, con una cifra decimale. */
  rating: number;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng.js';
import { seasonStats, type SeasonStatsInput } from '../../src/engine/stats.js';

const starterForward: SeasonStatsInput = {
  overall: 78, role: 'FWD', minutesShare: 0.85, clubStrength: 76, leagueLevel: 1,
};

function averageOver(input: SeasonStatsInput, pick: (s: ReturnType<typeof seasonStats>) => number): number {
  let total = 0;
  for (let seed = 0; seed < 300; seed += 1) total += pick(seasonStats(input, createRng(seed)));
  return total / 300;
}

describe('seasonStats', () => {
  it('un attaccante titolare forte segna quanto un attaccante vero', () => {
    const goals = averageOver(starterForward, (s) => s.goals);
    expect(goals).toBeGreaterThan(9);
    expect(goals).toBeLessThan(22);
  });

  it('nessuna stagione assurda: mai più di 45 gol', () => {
    for (let seed = 0; seed < 2000; seed += 1) {
      const stats = seasonStats({ ...starterForward, overall: 94 }, createRng(seed));
      expect(stats.goals).toBeLessThanOrEqual(45);
    }
  });

  it('i portieri non segnano e i difensori quasi mai', () => {
    expect(averageOver({ ...starterForward, role: 'GK' }, (s) => s.goals)).toBe(0);
    const defenderGoals = averageOver({ ...starterForward, role: 'DEF' }, (s) => s.goals);
    expect(defenderGoals).toBeGreaterThan(0);
    expect(defenderGoals).toBeLessThan(6);
  });

  it('i centrocampisti fanno più assist che gol', () => {
    const goals = averageOver({ ...starterForward, role: 'MID' }, (s) => s.goals);
    const assists = averageOver({ ...starterForward, role: 'MID' }, (s) => s.assists);
    expect(assists).toBeGreaterThan(goals);
  });

  it('chi gioca poco produce poco', () => {
    const benched = averageOver({ ...starterForward, minutesShare: 0.08 }, (s) => s.goals);
    const starter = averageOver(starterForward, (s) => s.goals);
    expect(benched).toBeLessThan(starter / 3);
  });

  it('le presenze e i minuti sono coerenti fra loro', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const stats = seasonStats(starterForward, createRng(seed));
      expect(stats.minutes).toBeLessThanOrEqual(stats.appearances * 90);
      expect(stats.appearances).toBeLessThanOrEqual(38);
      if (stats.appearances === 0) expect(stats.minutes).toBe(0);
    }
  });

  it('i clean sheet arrivano solo a portieri e difensori, e dipendono dalla squadra', () => {
    expect(averageOver({ ...starterForward, role: 'FWD' }, (s) => s.cleanSheets)).toBe(0);
    const strongTeam = averageOver({ ...starterForward, role: 'GK', clubStrength: 84 }, (s) => s.cleanSheets);
    const weakTeam = averageOver({ ...starterForward, role: 'GK', clubStrength: 62 }, (s) => s.cleanSheets);
    expect(strongTeam).toBeGreaterThan(weakTeam + 2);
  });

  it('il voto medio resta nella scala del calcio', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const stats = seasonStats(starterForward, createRng(seed));
      expect(stats.rating).toBeGreaterThanOrEqual(5);
      expect(stats.rating).toBeLessThanOrEqual(9);
    }
  });

  it('un fuoriclasse ha un voto più alto di uno scarso', () => {
    const great = averageOver({ ...starterForward, overall: 90 }, (s) => s.rating);
    const poor = averageOver({ ...starterForward, overall: 58 }, (s) => s.rating);
    expect(great).toBeGreaterThan(poor + 0.4);
  });

  it('segnare in quarta divisione non è come segnare in Serie A', () => {
    const top = averageOver({ ...starterForward, leagueLevel: 1 }, (s) => s.goals);
    const bottom = averageOver({ ...starterForward, leagueLevel: 4 }, (s) => s.goals);
    expect(bottom).toBeGreaterThan(top);
  });

  it('è deterministico', () => {
    expect(seasonStats(starterForward, createRng(11))).toEqual(
      seasonStats(starterForward, createRng(11)),
    );
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/stats.test.ts`
Expected: FAIL — modulo `stats.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/stats.ts`:

```ts
import type { Role } from '../world/types.js';
import type { Rng } from './rng.js';
import type { SeasonStats } from './types.js';

export interface SeasonStatsInput {
  overall: number;
  role: Role;
  minutesShare: number;
  clubStrength: number;
  /** 1 = massima serie. Più si scende, più è facile incidere. */
  leagueLevel: number;
}

const MATCHES_PER_SEASON = 38;
const MINUTES_PER_MATCH = 90;

/** Gol e assist attesi in una stagione piena, a overall 70, in una squadra media di prima divisione. */
const OUTPUT_BY_ROLE: Record<Role, { goals: number; assists: number }> = {
  GK: { goals: 0, assists: 0 },
  DEF: { goals: 1.5, assists: 2 },
  MID: { goals: 4, assists: 6 },
  FWD: { goals: 10, assists: 4 },
};

const CLEAN_SHEET_ROLES: readonly Role[] = ['GK', 'DEF'];

/** Estrae un intero attorno a una media, con la varianza di una stagione vera. */
function around(expected: number, rng: Rng): number {
  if (expected <= 0) return 0;
  const spread = 0.45;
  const factor = 1 + (rng.next() - 0.5) * 2 * spread;
  return Math.max(0, Math.round(expected * factor));
}

export function seasonStats(input: SeasonStatsInput, rng: Rng): SeasonStats {
  const minutes = Math.round(MATCHES_PER_SEASON * MINUTES_PER_MATCH * input.minutesShare);
  const appearances = Math.min(
    MATCHES_PER_SEASON,
    Math.round(MATCHES_PER_SEASON * Math.min(1, input.minutesShare * 1.25)),
  );

  const talent = (input.overall / 70) ** 3;
  // In quarta serie si incide di più: gli avversari sono più deboli.
  const levelBonus = 1 + (input.leagueLevel - 1) * 0.12;
  const seasonFraction = minutes / (MATCHES_PER_SEASON * MINUTES_PER_MATCH);
  const output = OUTPUT_BY_ROLE[input.role];

  const goals = around(output.goals * talent * levelBonus * seasonFraction, rng);
  const assists = around(output.assists * talent * levelBonus * seasonFraction, rng);

  const cleanSheets = CLEAN_SHEET_ROLES.includes(input.role)
    ? around(appearances * (0.05 + Math.max(0, input.clubStrength - 60) * 0.012), rng)
    : 0;

  const contribution = input.role === 'GK'
    ? cleanSheets / Math.max(1, appearances)
    : (goals + assists) / Math.max(1, appearances);
  const rawRating =
    6 + (input.overall - 70) * 0.025 + contribution * 0.8 + (rng.next() - 0.5) * 0.4;
  const rating = Math.round(Math.min(9, Math.max(5, rawRating)) * 10) / 10;

  return {
    appearances: minutes === 0 ? 0 : appearances,
    minutes,
    goals,
    assists,
    cleanSheets: Math.min(cleanSheets, appearances),
    rating,
  };
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/stats.test.ts`
Expected: 11 test passati.

Se «un attaccante titolare forte segna quanto un attaccante vero» fallisce, **non allargare l'intervallo del test**: 9-22 gol è il contratto col realismo. Correggere `OUTPUT_BY_ROLE` o l'esponente del talento.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/stats.ts tests/engine/stats.test.ts
git commit -m "feat: statistiche stagionali con gol, assist, clean sheet e voto"
```

---

### Task 3: Trofei

**Files:**
- Modify: `src/engine/types.ts` (aggiungere `Trophy`, `TrophyKind`)
- Create: `src/engine/competitions.ts`
- Test: `tests/engine/competitions.test.ts`

**Interfaces:**
- Consumes: `Rng`
- Produces:
  - `TrophyKind` = `'league' | 'nationalCup' | 'continental'`
  - `Trophy` = `{ kind: TrophyKind; season: number; competitionName: string }`
  - `resolveTrophies(input: TrophiesInput, rng: Rng): Trophy[]`
  - `TrophiesInput` = `{ season: number; leagueName: string; position: number; clubCount: number; qualifiedToContinental: boolean; minutesShare: number }`

Regole: il campionato lo vince chi arriva primo. La coppa nazionale è una lotteria pesata sulla posizione: chi sta in alto ha più probabilità, ma può vincerla anche una media. La coppa continentale si gioca solo se qualificati (arrivo nei primi quattro l'anno prima) e si vince di rado.

- [ ] **Step 1: Aggiungere i tipi**

In `src/engine/types.ts`:

```ts
export type TrophyKind = 'league' | 'nationalCup' | 'continental';

export interface Trophy {
  kind: TrophyKind;
  season: number;
  competitionName: string;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/competitions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveTrophies, type TrophiesInput } from '../../src/engine/competitions.js';
import { createRng } from '../../src/engine/rng.js';

const champion: TrophiesInput = {
  season: 5, leagueName: 'Serie A', position: 1, clubCount: 20,
  qualifiedToContinental: true, minutesShare: 0.8,
};

function rate(input: TrophiesInput, kind: string): number {
  let won = 0;
  for (let seed = 0; seed < 1000; seed += 1) {
    if (resolveTrophies(input, createRng(seed)).some((t) => t.kind === kind)) won += 1;
  }
  return won / 1000;
}

describe('resolveTrophies', () => {
  it('chi arriva primo vince il campionato, sempre', () => {
    expect(rate(champion, 'league')).toBe(1);
  });

  it('chi arriva secondo non vince il campionato, mai', () => {
    expect(rate({ ...champion, position: 2 }, 'league')).toBe(0);
  });

  it('il trofeo di campionato porta il nome del campionato', () => {
    const trophies = resolveTrophies(champion, createRng(1));
    const league = trophies.find((t) => t.kind === 'league');
    expect(league?.competitionName).toBe('Serie A');
    expect(league?.season).toBe(5);
  });

  it('la coppa nazionale la vince più spesso chi sta in alto', () => {
    expect(rate(champion, 'nationalCup')).toBeGreaterThan(
      rate({ ...champion, position: 12 }, 'nationalCup'),
    );
  });

  it('la coppa nazionale resta possibile per una squadra di metà classifica', () => {
    const chance = rate({ ...champion, position: 10 }, 'nationalCup');
    expect(chance).toBeGreaterThan(0.01);
    expect(chance).toBeLessThan(0.2);
  });

  it('senza qualificazione non si vince la coppa continentale', () => {
    expect(rate({ ...champion, qualifiedToContinental: false }, 'continental')).toBe(0);
  });

  it('la coppa continentale è rara anche per chi vince il campionato', () => {
    const chance = rate(champion, 'continental');
    expect(chance).toBeGreaterThan(0.02);
    expect(chance).toBeLessThan(0.3);
  });

  it('è deterministico', () => {
    expect(resolveTrophies(champion, createRng(3))).toEqual(
      resolveTrophies(champion, createRng(3)),
    );
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/competitions.test.ts`
Expected: FAIL — modulo `competitions.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/competitions.ts`:

```ts
import type { Rng } from './rng.js';
import type { Trophy } from './types.js';

export interface TrophiesInput {
  season: number;
  leagueName: string;
  /** Posizione finale in campionato, 1-based. */
  position: number;
  clubCount: number;
  /** Qualificata alla coppa continentale grazie alla stagione precedente. */
  qualifiedToContinental: boolean;
  minutesShare: number;
}

/** Quanto pesa la posizione sulla coppa nazionale: il primo è favorito, l'ultimo quasi mai. */
function cupChance(position: number, clubCount: number): number {
  const normalized = 1 - (position - 1) / Math.max(1, clubCount - 1);
  return 0.03 + normalized ** 2 * 0.27;
}

export function resolveTrophies(input: TrophiesInput, rng: Rng): Trophy[] {
  const trophies: Trophy[] = [];

  if (input.position === 1) {
    trophies.push({ kind: 'league', season: input.season, competitionName: input.leagueName });
  }

  if (rng.chance(cupChance(input.position, input.clubCount))) {
    trophies.push({ kind: 'nationalCup', season: input.season, competitionName: 'Coppa Nazionale' });
  }

  if (input.qualifiedToContinental) {
    const strength = 1 - (input.position - 1) / Math.max(1, input.clubCount - 1);
    if (rng.chance(0.03 + strength ** 3 * 0.15)) {
      trophies.push({
        kind: 'continental',
        season: input.season,
        competitionName: 'Coppa Continentale',
      });
    }
  }

  return trophies;
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/competitions.test.ts`
Expected: 8 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/competitions.ts tests/engine/competitions.test.ts
git commit -m "feat: trofei di campionato, coppa nazionale e coppa continentale"
```

---

### Task 4: Premi individuali

**Files:**
- Modify: `src/engine/types.ts` (aggiungere `Award`, `AwardKind`)
- Create: `src/engine/awards.ts`
- Test: `tests/engine/awards.test.ts`

**Interfaces:**
- Consumes: `Role`, `Rng`, `SeasonStats`
- Produces:
  - `AwardKind` = `'topScorer' | 'leagueMvp' | 'youngPlayer'`
  - `Award` = `{ kind: AwardKind; season: number; competitionName: string }`
  - `resolveAwards(input: AwardsInput, rng: Rng): Award[]`
  - `AwardsInput` = `{ season: number; leagueName: string; leagueLevel: number; age: number; role: Role; stats: SeasonStats; position: number }`

I premi non si assegnano confrontando tutti i giocatori del mondo — sarebbe costosissimo e in Fase 2 non serve. Si usano soglie tarate sul livello del campionato: sopra una certa produzione, il premio diventa probabile.

- [ ] **Step 1: Aggiungere i tipi**

In `src/engine/types.ts`:

```ts
export type AwardKind = 'topScorer' | 'leagueMvp' | 'youngPlayer';

export interface Award {
  kind: AwardKind;
  season: number;
  competitionName: string;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/awards.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveAwards, type AwardsInput } from '../../src/engine/awards.js';
import { createRng } from '../../src/engine/rng.js';
import type { SeasonStats } from '../../src/engine/types.js';

function stats(goals: number, assists = 5, rating = 7.2): SeasonStats {
  return { appearances: 34, minutes: 2900, goals, assists, cleanSheets: 0, rating };
}

const base: AwardsInput = {
  season: 4, leagueName: 'Serie A', leagueLevel: 1, age: 26, role: 'FWD',
  stats: stats(12), position: 5,
};

function rate(input: AwardsInput, kind: string): number {
  let won = 0;
  for (let seed = 0; seed < 1000; seed += 1) {
    if (resolveAwards(input, createRng(seed)).some((a) => a.kind === kind)) won += 1;
  }
  return won / 1000;
}

describe('resolveAwards', () => {
  it('chi segna tantissimo diventa spesso capocannoniere', () => {
    expect(rate({ ...base, stats: stats(28) }, 'topScorer')).toBeGreaterThan(0.5);
  });

  it('con dodici gol il titolo di capocannoniere è raro', () => {
    expect(rate(base, 'topScorer')).toBeLessThan(0.1);
  });

  it('servono più gol in Serie A che in quarta divisione', () => {
    const top = rate({ ...base, stats: stats(20), leagueLevel: 1 }, 'topScorer');
    const low = rate({ ...base, stats: stats(20), leagueLevel: 4 }, 'topScorer');
    expect(low).toBeGreaterThan(top);
  });

  it('il premio di miglior giocatore chiede una grande stagione e una grande squadra', () => {
    const winner = rate({ ...base, stats: stats(22, 10, 8.2), position: 1 }, 'leagueMvp');
    const midTable = rate({ ...base, stats: stats(22, 10, 8.2), position: 12 }, 'leagueMvp');
    expect(winner).toBeGreaterThan(midTable);
    expect(winner).toBeGreaterThan(0.15);
  });

  it('il premio giovani va solo agli under 22', () => {
    expect(rate({ ...base, age: 21, stats: stats(15, 8, 7.6) }, 'youngPlayer')).toBeGreaterThan(0.1);
    expect(rate({ ...base, age: 25, stats: stats(15, 8, 7.6) }, 'youngPlayer')).toBe(0);
  });

  it('un portiere non vince il titolo di capocannoniere', () => {
    const keeper: AwardsInput = {
      ...base, role: 'GK',
      stats: { appearances: 38, minutes: 3420, goals: 0, assists: 0, cleanSheets: 18, rating: 7.8 },
    };
    expect(rate(keeper, 'topScorer')).toBe(0);
  });

  it('un portiere può comunque essere il migliore del campionato', () => {
    const keeper: AwardsInput = {
      ...base, role: 'GK', position: 1,
      stats: { appearances: 38, minutes: 3420, goals: 0, assists: 0, cleanSheets: 21, rating: 8.3 },
    };
    expect(rate(keeper, 'leagueMvp')).toBeGreaterThan(0.1);
  });

  it('una stagione da riserva non vince niente', () => {
    const bench: AwardsInput = {
      ...base,
      stats: { appearances: 4, minutes: 180, goals: 1, assists: 0, cleanSheets: 0, rating: 6.1 },
    };
    for (let seed = 0; seed < 200; seed += 1) {
      expect(resolveAwards(bench, createRng(seed))).toEqual([]);
    }
  });

  it('è deterministico', () => {
    expect(resolveAwards(base, createRng(8))).toEqual(resolveAwards(base, createRng(8)));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/awards.test.ts`
Expected: FAIL — modulo `awards.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/awards.ts`:

```ts
import type { Role } from '../world/types.js';
import type { Rng } from './rng.js';
import type { Award, SeasonStats } from './types.js';

export interface AwardsInput {
  season: number;
  leagueName: string;
  leagueLevel: number;
  age: number;
  role: Role;
  stats: SeasonStats;
  position: number;
}

/** Gol che servono per essere in lotta per il titolo di capocannoniere in prima divisione. */
const TOP_SCORER_BAR = 24;
const MIN_APPEARANCES = 15;

export function resolveAwards(input: AwardsInput, rng: Rng): Award[] {
  const awards: Award[] = [];
  if (input.stats.appearances < MIN_APPEARANCES) return awards;

  // Più si scende di categoria, meno gol servono per dominare la classifica marcatori.
  const bar = TOP_SCORER_BAR - (input.leagueLevel - 1) * 4;

  if (input.role !== 'GK') {
    const margin = (input.stats.goals - bar) / bar;
    const chance = Math.min(0.85, Math.max(0, 0.35 + margin));
    if (margin > -0.5 && rng.chance(chance)) {
      awards.push({ kind: 'topScorer', season: input.season, competitionName: input.leagueName });
    }
  }

  const positionBonus = input.position === 1 ? 0.25 : input.position <= 4 ? 0.1 : 0;
  const mvpScore = (input.stats.rating - 7.4) * 0.6 + positionBonus;
  if (mvpScore > 0 && rng.chance(Math.min(0.6, mvpScore))) {
    awards.push({ kind: 'leagueMvp', season: input.season, competitionName: input.leagueName });
  }

  if (input.age <= 21) {
    const youngScore = (input.stats.rating - 7.0) * 0.5;
    if (youngScore > 0 && rng.chance(Math.min(0.6, youngScore))) {
      awards.push({ kind: 'youngPlayer', season: input.season, competitionName: input.leagueName });
    }
  }

  return awards;
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/awards.test.ts`
Expected: 9 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/awards.ts tests/engine/awards.test.ts
git commit -m "feat: premi individuali con soglie tarate sul livello del campionato"
```

---

### Task 5: Valore di mercato, tarato sui dati veri

Il numero che muove tutto il mercato. Non va inventato: il dataset contiene il valore reale di 18.405 giocatori, quindi la funzione si **verifica** contro la realtà.

Misure già estratte dal dataset (mediane in milioni di euro, non serve rifare l'analisi):

| Overall | 16-21 | 22-25 | 26-29 | 30-33 | 34+ |
|---|---|---|---|---|---|
| 50-59 | 0.3 | 0.3 | 0.2 | 0.1 | 0.0 |
| 60-64 | 0.9 | 0.7 | 0.5 | 0.3 | 0.1 |
| 65-69 | 2.0 | 1.6 | 1.1 | 0.7 | 0.3 |
| 70-74 | 4.4 | 3.5 | 2.2 | 1.6 | 0.7 |
| 75-79 | 16.5 | 14.0 | 8.5 | 6.0 | 2.4 |
| 80-84 | 42.5 | 37.2 | 27.5 | 20.0 | 8.2 |
| 85+ | — | 100.8 | 79.5 | 46.2 | 18.5 |

Altre due misure dallo stesso dataset: a parità di overall il potenziale alza il valore al massimo del 30%; lo **stipendio settimanale è il 3,36 per mille del valore**.

**Files:**
- Create: `src/engine/value.ts`
- Test: `tests/engine/value.test.ts`, `tests/engine/valueReal.test.ts`

**Interfaces:**
- Consumes: niente (funzioni pure senza rng)
- Produces:
  - `marketValue(overall: number, age: number, potential: number): number` — euro
  - `weeklyWage(valueEur: number): number` — euro a settimana

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/value.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { marketValue, weeklyWage } from '../../src/engine/value.js';

describe('marketValue', () => {
  it('cresce con l'overall, sempre', () => {
    let previous = 0;
    for (let overall = 50; overall <= 94; overall += 1) {
      const value = marketValue(overall, 24, overall + 5);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('un ventenne vale più di un trentacinquenne a parità di livello', () => {
    expect(marketValue(80, 20, 88)).toBeGreaterThan(marketValue(80, 35, 80) * 3);
  });

  it('il picco di valore è fra i venti e i venticinque anni', () => {
    const values = [18, 22, 26, 30, 34].map((age) => marketValue(78, age, 84));
    const best = Math.max(...values);
    expect(values.indexOf(best)).toBeLessThanOrEqual(1);
  });

  it('il potenziale alza il valore, ma non lo raddoppia', () => {
    const modest = marketValue(68, 20, 70);
    const huge = marketValue(68, 20, 92);
    expect(huge).toBeGreaterThan(modest);
    expect(huge).toBeLessThan(modest * 1.6);
  });

  it('non restituisce mai valori negativi o assurdi', () => {
    expect(marketValue(40, 38, 40)).toBeGreaterThanOrEqual(0);
    expect(marketValue(99, 24, 99)).toBeLessThan(400_000_000);
  });
});

describe('weeklyWage', () => {
  it('è una frazione piccola del valore', () => {
    expect(weeklyWage(100_000_000)).toBeGreaterThan(200_000);
    expect(weeklyWage(100_000_000)).toBeLessThan(500_000);
  });

  it('cresce col valore', () => {
    expect(weeklyWage(50_000_000)).toBeGreaterThan(weeklyWage(5_000_000));
  });
});
```

`tests/engine/valueReal.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { marketValue } from '../../src/engine/value.js';

/**
 * La verifica che conta: la funzione deve riprodurre le mediane osservate nel
 * dataset reale. Se un giorno si cambia il database, questo test dice subito
 * se la curva del valore è ancora sensata.
 */
function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe('valore contro i dati reali', () => {
  it('resta entro il 40% della mediana vera in ogni fascia', () => {
    const csv = readFileSync('data/raw/fc26-players.csv', 'utf8').split('\n');
    const header = csv[0]!.split(',');
    const col = (name: string): number => header.indexOf(name);
    const iOverall = col('overall');
    const iAge = col('age');
    const iPotential = col('potential');
    const iValue = col('value_eur');

    const rows = csv.slice(1).map((line) => line.split(','));
    const buckets: [number, number, number, number][] = [
      [60, 64, 22, 25], [65, 69, 22, 25], [70, 74, 22, 25],
      [75, 79, 22, 25], [80, 84, 22, 25],
      [65, 69, 30, 33], [75, 79, 30, 33],
    ];

    for (const [minOvr, maxOvr, minAge, maxAge] of buckets) {
      const selected = rows.filter((row) => {
        const overall = Number(row[iOverall]);
        const age = Number(row[iAge]);
        return overall >= minOvr && overall <= maxOvr && age >= minAge && age <= maxAge
          && Number(row[iValue]) > 0;
      });
      if (selected.length < 20) continue;

      const realMedian = medianOf(selected.map((row) => Number(row[iValue])));
      const mineMedian = medianOf(
        selected.map((row) =>
          marketValue(Number(row[iOverall]), Number(row[iAge]), Number(row[iPotential])),
        ),
      );
      const ratio = mineMedian / realMedian;
      expect(
        ratio,
        `fascia OVR ${minOvr}-${maxOvr} età ${minAge}-${maxAge}: mia ${(mineMedian / 1e6).toFixed(1)}M contro reale ${(realMedian / 1e6).toFixed(1)}M`,
      ).toBeGreaterThan(0.6);
      expect(ratio).toBeLessThan(1.4);
    }
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/value.test.ts tests/engine/valueReal.test.ts`
Expected: FAIL — modulo `value.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/value.ts`:

```ts
/**
 * Valore di mercato e stipendio, tarati sulle mediane osservate nel dataset reale
 * (18.405 giocatori). Le ancore sono valori misurati, non stimati: vedi il piano
 * di Fase 2 e `tests/engine/valueReal.test.ts`.
 */

/** Valore mediano in euro per overall, alla fascia d'età 22-25. */
const VALUE_ANCHORS: readonly (readonly [number, number])[] = [
  [55, 300_000],
  [62, 700_000],
  [67, 1_600_000],
  [72, 3_500_000],
  [77, 14_000_000],
  [82, 37_200_000],
  [87, 100_800_000],
  [94, 190_000_000],
];

/** Moltiplicatore per età, rispetto alla fascia 22-25 presa come riferimento. */
const AGE_ANCHORS: readonly (readonly [number, number])[] = [
  [19, 1.25],
  [23.5, 1.0],
  [27.5, 0.68],
  [31.5, 0.46],
  [36, 0.19],
  [41, 0.05],
];

/** Interpolazione geometrica fra due ancore: il valore cresce in modo esponenziale. */
function interpolate(
  anchors: readonly (readonly [number, number])[],
  x: number,
  geometric: boolean,
): number {
  const first = anchors[0]!;
  const last = anchors[anchors.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];

  for (let i = 1; i < anchors.length; i += 1) {
    const [x1, y1] = anchors[i - 1]!;
    const [x2, y2] = anchors[i]!;
    if (x <= x2) {
      const t = (x - x1) / (x2 - x1);
      return geometric ? y1 * (y2 / y1) ** t : y1 + (y2 - y1) * t;
    }
  }
  return last[1];
}

export function marketValue(overall: number, age: number, potential: number): number {
  const base = interpolate(VALUE_ANCHORS, overall, true);
  const ageFactor = interpolate(AGE_ANCHORS, age, false);
  // Il potenziale conta, ma meno di quanto si creda: +30% al massimo.
  const upside = Math.max(0, potential - overall);
  const potentialFactor = 1 + Math.min(0.3, upside * 0.025);
  return Math.round((base * ageFactor * potentialFactor) / 10_000) * 10_000;
}

/** Nel dataset reale lo stipendio settimanale è il 3,36 per mille del valore. */
export function weeklyWage(valueEur: number): number {
  return Math.round((valueEur * 0.00336) / 100) * 100;
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/value.test.ts tests/engine/valueReal.test.ts`
Expected: 7 test passati.

Se una fascia esce dal ±40%, il messaggio del test dice quale e di quanto: correggere l'ancora corrispondente in `VALUE_ANCHORS` o `AGE_ANCHORS`. **Non allargare la tolleranza del test.**

- [ ] **Step 5: Commit**

```bash
git add src/engine/value.ts tests/engine/value.test.ts tests/engine/valueReal.test.ts
git commit -m "feat: valore di mercato e stipendio tarati sulle mediane reali del dataset"
```

---

### Task 6: Le offerte

Il sistema che sblocca la trappola documentata in D-004: se non giochi, qualcuno ti porta via.

**Files:**
- Modify: `src/engine/types.ts` (aggiungere `Offer`)
- Create: `src/engine/market.ts`
- Test: `tests/engine/market.test.ts`

**Interfaces:**
- Consumes: `Club`, `LeagueSummary`, `Rng`, `clubStrength`, `playingTimeShare`, `marketValue`, `weeklyWage`
- Produces:
  - `Offer` = `{ clubId: string; clubName: string; leagueId: string; leagueName: string; leagueLevel: number; feeEur: number; weeklyWageEur: number; expectedMinutesShare: number; isLoan: boolean }`
  - `generateOffers(input: OffersInput, rng: Rng): Offer[]`
  - `OffersInput` = `{ player: { overall: number; age: number; potential: number; role: Role }; currentClubId: string; currentMinutesShare: number; stats: SeasonStats; candidates: readonly CandidateClub[] }`
  - `CandidateClub` = `{ club: Club; leagueId: string; leagueName: string; leagueLevel: number }`

Regole: un club si interessa se il giocatore migliorerebbe la sua rosa e se se lo può permettere (il suo valore deve stare in una forbice rispetto alla forza del club). I giovani che non giocano ricevono **prestiti** da club più deboli, dove giocherebbero. Ogni offerta dichiara i minuti attesi: è l'informazione che in Fase 4 permette all'utente di scegliere con cognizione, ed è il cuore del "rischio dichiarato" della spec §3.5.

- [ ] **Step 1: Aggiungere il tipo**

In `src/engine/types.ts`:

```ts
/** Un'offerta ricevuta a fine stagione. `expectedMinutesShare` è la stima che l'utente vede. */
export interface Offer {
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  leagueLevel: number;
  feeEur: number;
  weeklyWageEur: number;
  expectedMinutesShare: number;
  isLoan: boolean;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/market.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateOffers, type CandidateClub, type OffersInput } from '../../src/engine/market.js';
import { createRng } from '../../src/engine/rng.js';
import type { SeasonStats } from '../../src/engine/types.js';
import type { Club, Role, WorldPlayer } from '../../src/world/types.js';

function club(id: string, name: string, overalls: readonly number[]): Club {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `${id}p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id, name, squad };
}

function candidate(id: string, name: string, level: number, overalls: readonly number[]): CandidateClub {
  return { club: club(id, name, overalls), leagueId: `lg-${level}`, leagueName: `Lega ${level}`, leagueLevel: level };
}

const goodSeason: SeasonStats = {
  appearances: 34, minutes: 2900, goals: 18, assists: 7, cleanSheets: 0, rating: 7.6,
};
const benchSeason: SeasonStats = {
  appearances: 5, minutes: 200, goals: 0, assists: 1, cleanSheets: 0, rating: 6.1,
};

const big = candidate('big', 'Grande Club', 1, Array.from({ length: 22 }, () => 84));
const mid = candidate('mid', 'Club Medio', 1, Array.from({ length: 22 }, () => 72));
const small = candidate('small', 'Club Piccolo', 2, Array.from({ length: 22 }, () => 62));

const base: OffersInput = {
  player: { overall: 74, age: 23, potential: 86, role: 'FWD' },
  currentClubId: 'mid',
  currentMinutesShare: 0.8,
  stats: goodSeason,
  candidates: [big, mid, small],
};

describe('generateOffers', () => {
  it('non arrivano offerte dal club in cui già giochi', () => {
    const offers = generateOffers(base, createRng(1));
    expect(offers.some((offer) => offer.clubId === 'mid')).toBe(false);
  });

  it('dopo una grande stagione qualcuno si fa avanti', () => {
    let withOffers = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (generateOffers(base, createRng(seed)).length > 0) withOffers += 1;
    }
    expect(withOffers).toBeGreaterThan(60);
  });

  it('ogni offerta dichiara i minuti attesi, e sono credibili', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      for (const offer of generateOffers(base, createRng(seed))) {
        expect(offer.expectedMinutesShare).toBeGreaterThan(0);
        expect(offer.expectedMinutesShare).toBeLessThanOrEqual(0.95);
      }
    }
  });

  it('in un club più forte si giocherebbe di meno', () => {
    const offers = generateOffers(base, createRng(3));
    const fromBig = offers.find((offer) => offer.clubId === 'big');
    const fromSmall = offers.find((offer) => offer.clubId === 'small');
    if (fromBig && fromSmall) {
      expect(fromSmall.expectedMinutesShare).toBeGreaterThan(fromBig.expectedMinutesShare);
    }
  });

  it('un giovane che non gioca riceve proposte di prestito', () => {
    const stuck: OffersInput = {
      player: { overall: 62, age: 19, potential: 88, role: 'FWD' },
      currentClubId: 'big',
      currentMinutesShare: 0.05,
      stats: benchSeason,
      candidates: [big, mid, small],
    };
    let loans = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (generateOffers(stuck, createRng(seed)).some((offer) => offer.isLoan)) loans += 1;
    }
    expect(loans).toBeGreaterThan(50);
  });

  it('un trentaseienne in declino riceve poche offerte, e non dai grandi club', () => {
    const veteran: OffersInput = {
      ...base,
      player: { overall: 66, age: 36, potential: 66, role: 'FWD' },
      stats: { ...goodSeason, goals: 6, rating: 6.6 },
    };
    for (let seed = 0; seed < 50; seed += 1) {
      expect(generateOffers(veteran, createRng(seed)).some((o) => o.clubId === 'big')).toBe(false);
    }
  });

  it('il costo del cartellino segue il valore del giocatore', () => {
    const offers = generateOffers(base, createRng(5));
    for (const offer of offers) {
      if (offer.isLoan) continue;
      expect(offer.feeEur).toBeGreaterThan(0);
      expect(offer.weeklyWageEur).toBeGreaterThan(0);
    }
  });

  it('senza club candidati non succede niente', () => {
    expect(generateOffers({ ...base, candidates: [] }, createRng(1))).toEqual([]);
  });

  it('è deterministico', () => {
    expect(generateOffers(base, createRng(7))).toEqual(generateOffers(base, createRng(7)));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/market.test.ts`
Expected: FAIL — modulo `market.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/market.ts`:

```ts
import type { Club, Role } from '../world/types.js';
import { clubStrength } from './clubStrength.js';
import { playingTimeShare } from './playingTime.js';
import type { Rng } from './rng.js';
import type { Offer, SeasonStats } from './types.js';
import { marketValue, weeklyWage } from './value.js';

export interface CandidateClub {
  club: Club;
  leagueId: string;
  leagueName: string;
  leagueLevel: number;
}

export interface OffersInput {
  player: { overall: number; age: number; potential: number; role: Role };
  currentClubId: string;
  currentMinutesShare: number;
  stats: SeasonStats;
  candidates: readonly CandidateClub[];
}

const MAX_OFFERS = 4;
/** Sotto questa quota di minuti un giovane è considerato bloccato e va mandato a giocare. */
const STUCK_SHARE = 0.25;
const LOAN_AGE = 23;

/** Quanto una stagione è piaciuta: usata per alzare o abbassare l'interesse. */
function seasonScore(stats: SeasonStats, role: Role): number {
  if (stats.appearances < 5) return -0.3;
  const production = role === 'GK'
    ? stats.cleanSheets / Math.max(1, stats.appearances)
    : (stats.goals + stats.assists) / Math.max(1, stats.appearances);
  return (stats.rating - 6.8) * 0.5 + production * 0.6;
}

export function generateOffers(input: OffersInput, rng: Rng): Offer[] {
  const value = marketValue(input.player.overall, input.player.age, input.player.potential);
  const score = seasonScore(input.stats, input.player.role);
  const isStuck =
    input.player.age <= LOAN_AGE && input.currentMinutesShare < STUCK_SHARE;

  const offers: Offer[] = [];

  for (const candidate of input.candidates) {
    if (candidate.club.id === input.currentClubId) continue;

    const strength = clubStrength(candidate.club);
    const expectedMinutesShare = playingTimeShare(
      { overall: input.player.overall, age: input.player.age, role: input.player.role },
      candidate.club.squad,
    );

    // Un club guarda un giocatore se lo migliora o se ha il fisico per il futuro.
    const fitsSquad = input.player.overall >= strength - 6;
    const isProspect = input.player.age <= 23 && input.player.potential >= strength + 2;
    const wantsLoan = isStuck && expectedMinutesShare > 0.45;

    if (!fitsSquad && !isProspect && !wantsLoan) continue;

    // I club forti non prendono giocatori in là con gli anni che non li migliorano.
    if (input.player.age >= 33 && input.player.overall < strength) continue;

    const interest =
      0.25 + score + (isProspect ? 0.25 : 0) + (wantsLoan ? 0.5 : 0)
      - Math.max(0, (strength - input.player.overall) * 0.04);

    if (!rng.chance(Math.min(0.9, interest))) continue;

    const isLoan = wantsLoan && !fitsSquad;
    offers.push({
      clubId: candidate.club.id,
      clubName: candidate.club.name,
      leagueId: candidate.leagueId,
      leagueName: candidate.leagueName,
      leagueLevel: candidate.leagueLevel,
      feeEur: isLoan ? 0 : Math.round((value * (0.85 + rng.next() * 0.5)) / 10_000) * 10_000,
      weeklyWageEur: Math.round(weeklyWage(value) * (isLoan ? 1 : 1 + rng.next() * 0.4)),
      expectedMinutesShare,
      isLoan,
    });
  }

  return offers
    .sort((a, b) => b.feeEur - a.feeEur)
    .slice(0, MAX_OFFERS);
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/market.test.ts`
Expected: 9 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/market.ts tests/engine/market.test.ts
git commit -m "feat: offerte di mercato con minuti attesi dichiarati e prestiti per i giovani bloccati"
```

---

### Task 7: La politica di trasferimento

In Fase 4 sarà l'utente a scegliere. Qui serve una funzione che scelga da sola, perché il Simulation Lab deve poter girare diecimila carriere senza nessuno che clicchi.

**Files:**
- Modify: `src/engine/market.ts` (aggiungere la policy)
- Test: `tests/engine/transferPolicy.test.ts`

**Interfaces:**
- Consumes: `Offer`
- Produces:
  - `TransferPolicy` = `(offers: readonly Offer[], context: TransferContext) => Offer | null`
  - `TransferContext` = `{ currentMinutesShare: number; currentLeagueLevel: number; age: number }`
  - `ambitiousPolicy: TransferPolicy` — la politica predefinita del Lab

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/transferPolicy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ambitiousPolicy } from '../../src/engine/market.js';
import type { Offer } from '../../src/engine/types.js';

function offer(over: Partial<Offer>): Offer {
  return {
    clubId: 'c', clubName: 'Club', leagueId: 'lg', leagueName: 'Lega', leagueLevel: 1,
    feeEur: 10_000_000, weeklyWageEur: 40_000, expectedMinutesShare: 0.5, isLoan: false,
    ...over,
  };
}

const context = { currentMinutesShare: 0.5, currentLeagueLevel: 1, age: 24 };

describe('ambitiousPolicy', () => {
  it('senza offerte si resta dove si è', () => {
    expect(ambitiousPolicy([], context)).toBeNull();
  });

  it('chi non gioca accetta di andare dove giocherebbe', () => {
    const chosen = ambitiousPolicy(
      [offer({ clubId: 'gioca', expectedMinutesShare: 0.8, leagueLevel: 2 })],
      { ...context, currentMinutesShare: 0.05 },
    );
    expect(chosen?.clubId).toBe('gioca');
  });

  it('chi è titolare non scende di categoria per giocare uguale', () => {
    const chosen = ambitiousPolicy(
      [offer({ clubId: 'giù', expectedMinutesShare: 0.85, leagueLevel: 3 })],
      { ...context, currentMinutesShare: 0.8, currentLeagueLevel: 1 },
    );
    expect(chosen).toBeNull();
  });

  it('a parità di minuti si sceglie il club più importante', () => {
    const chosen = ambitiousPolicy(
      [
        offer({ clubId: 'piccolo', expectedMinutesShare: 0.7, feeEur: 2_000_000 }),
        offer({ clubId: 'grande', expectedMinutesShare: 0.7, feeEur: 60_000_000 }),
      ],
      context,
    );
    expect(chosen?.clubId).toBe('grande');
  });

  it('non si accetta un club dove si finirebbe in panchina', () => {
    const chosen = ambitiousPolicy(
      [offer({ clubId: 'panchina', expectedMinutesShare: 0.1, feeEur: 90_000_000 })],
      { ...context, currentMinutesShare: 0.7 },
    );
    expect(chosen).toBeNull();
  });

  it('è deterministica: nessuna casualità nella scelta', () => {
    const offers = [
      offer({ clubId: 'a', expectedMinutesShare: 0.6 }),
      offer({ clubId: 'b', expectedMinutesShare: 0.75 }),
    ];
    expect(ambitiousPolicy(offers, context)?.clubId).toBe(ambitiousPolicy(offers, context)?.clubId);
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/transferPolicy.test.ts`
Expected: FAIL — `ambitiousPolicy` non è esportata.

- [ ] **Step 3: Implementare**

Aggiungere in fondo a `src/engine/market.ts`:

```ts
export interface TransferContext {
  currentMinutesShare: number;
  currentLeagueLevel: number;
  age: number;
}

/**
 * Come sceglie il giocatore quando nessuno clicca: in Fase 4 questa funzione
 * viene sostituita dalla decisione dell'utente.
 */
export type TransferPolicy = (
  offers: readonly Offer[],
  context: TransferContext,
) => Offer | null;

/** Il punteggio che il Lab usa per decidere: prima i minuti, poi l'ambizione. */
function offerScore(offer: Offer, context: TransferContext): number {
  const minutesGain = offer.expectedMinutesShare - context.currentMinutesShare;
  const levelGain = context.currentLeagueLevel - offer.leagueLevel;
  const prestige = Math.log10(Math.max(1, offer.feeEur)) / 10;
  return minutesGain * 2 + levelGain * 0.35 + prestige;
}

/** Politica predefinita: giocare conta più di tutto, ma senza buttare via la carriera. */
export const ambitiousPolicy: TransferPolicy = (offers, context) => {
  const acceptable = offers.filter((offer) => {
    // Mai finire in panchina di proposito.
    if (offer.expectedMinutesShare < 0.3 && offer.expectedMinutesShare <= context.currentMinutesShare) {
      return false;
    }
    // Si scende di categoria solo se serve davvero a giocare.
    if (offer.leagueLevel > context.currentLeagueLevel && context.currentMinutesShare >= 0.5) {
      return false;
    }
    return true;
  });

  if (acceptable.length === 0) return null;

  const best = acceptable.reduce((champion, offer) =>
    offerScore(offer, context) > offerScore(champion, context) ? offer : champion,
  );

  return offerScore(best, context) > 0.55 ? best : null;
};
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/transferPolicy.test.ts`
Expected: 6 test passati.

- [ ] **Step 5: Commit**

```bash
git add src/engine/market.ts tests/engine/transferPolicy.test.ts
git commit -m "feat: politica di trasferimento automatica per il Simulation Lab"
```

---

### Task 8: La nazionale

**Files:**
- Modify: `src/engine/types.ts` (aggiungere `NationalSeason`)
- Create: `src/engine/national.ts`
- Test: `tests/engine/national.test.ts`

**Interfaces:**
- Consumes: `Role`, `Rng`, `SeasonStats`
- Produces:
  - `NationalSeason` = `{ capped: boolean; caps: number; goals: number; tournament: { name: string; stageReached: string } | null }`
  - `nationalSeason(input: NationalInput, rng: Rng): NationalSeason`
  - `NationalInput` = `{ season: number; age: number; overall: number; role: Role; stats: SeasonStats; leagueLevel: number; alreadyCapped: boolean }`

Un torneo internazionale ogni due stagioni (stagioni pari). Le fasi possibili: `'gironi' | 'ottavi' | 'quarti' | 'semifinale' | 'finale' | 'vittoria'`.

- [ ] **Step 1: Aggiungere il tipo**

In `src/engine/types.ts`:

```ts
/** La stagione in nazionale. `tournament` è valorizzato solo negli anni di torneo. */
export interface NationalSeason {
  capped: boolean;
  caps: number;
  goals: number;
  tournament: { name: string; stageReached: string } | null;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/national.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { nationalSeason, type NationalInput } from '../../src/engine/national.js';
import { createRng } from '../../src/engine/rng.js';
import type { SeasonStats } from '../../src/engine/types.js';

const bigSeason: SeasonStats = {
  appearances: 34, minutes: 2900, goals: 16, assists: 8, cleanSheets: 0, rating: 7.7,
};
const poorSeason: SeasonStats = {
  appearances: 12, minutes: 500, goals: 1, assists: 0, cleanSheets: 0, rating: 6.2,
};

const base: NationalInput = {
  season: 5, age: 25, overall: 82, role: 'FWD', stats: bigSeason,
  leagueLevel: 1, alreadyCapped: false,
};

function callUpRate(input: NationalInput): number {
  let capped = 0;
  for (let seed = 0; seed < 500; seed += 1) {
    if (nationalSeason(input, createRng(seed)).capped) capped += 1;
  }
  return capped / 500;
}

describe('nationalSeason', () => {
  it('un big in una grande stagione viene convocato quasi sempre', () => {
    expect(callUpRate(base)).toBeGreaterThan(0.8);
  });

  it('un giocatore di quarta divisione non viene convocato', () => {
    expect(callUpRate({ ...base, overall: 58, leagueLevel: 4, stats: poorSeason })).toBeLessThan(0.05);
  });

  it('chi è già nel giro resta più facilmente', () => {
    const newcomer = callUpRate({ ...base, overall: 74, stats: poorSeason, alreadyCapped: false });
    const veteran = callUpRate({ ...base, overall: 74, stats: poorSeason, alreadyCapped: true });
    expect(veteran).toBeGreaterThan(newcomer);
  });

  it('chi non è convocato non ha né presenze né gol né tornei', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const result = nationalSeason(
        { ...base, overall: 55, leagueLevel: 4, stats: poorSeason }, createRng(seed),
      );
      if (!result.capped) {
        expect(result.caps).toBe(0);
        expect(result.goals).toBe(0);
        expect(result.tournament).toBeNull();
      }
    }
  });

  it('il torneo si gioca solo negli anni pari della carriera', () => {
    const even = nationalSeason({ ...base, season: 6 }, createRng(1));
    const odd = nationalSeason({ ...base, season: 7 }, createRng(1));
    expect(even.tournament).not.toBeNull();
    expect(odd.tournament).toBeNull();
  });

  it('la fase raggiunta è una di quelle previste', () => {
    const stages = ['gironi', 'ottavi', 'quarti', 'semifinale', 'finale', 'vittoria'];
    for (let seed = 0; seed < 200; seed += 1) {
      const result = nationalSeason({ ...base, season: 4 }, createRng(seed));
      if (result.tournament) expect(stages).toContain(result.tournament.stageReached);
    }
  });

  it('i portieri non segnano in nazionale', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      expect(nationalSeason({ ...base, role: 'GK' }, createRng(seed)).goals).toBe(0);
    }
  });

  it('è deterministico', () => {
    expect(nationalSeason(base, createRng(4))).toEqual(nationalSeason(base, createRng(4)));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/national.test.ts`
Expected: FAIL — modulo `national.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/national.ts`:

```ts
import type { Role } from '../world/types.js';
import type { Rng } from './rng.js';
import type { NationalSeason, SeasonStats } from './types.js';

export interface NationalInput {
  season: number;
  age: number;
  overall: number;
  role: Role;
  stats: SeasonStats;
  leagueLevel: number;
  /** Chi è già nel giro della nazionale ci resta più facilmente. */
  alreadyCapped: boolean;
}

const TOURNAMENT_STAGES: readonly string[] = [
  'gironi', 'ottavi', 'quarti', 'semifinale', 'finale', 'vittoria',
];

export function nationalSeason(input: NationalInput, rng: Rng): NationalSeason {
  const empty: NationalSeason = { capped: false, caps: 0, goals: 0, tournament: null };

  // Il ct guarda il livello, la stagione appena fatta e la categoria in cui giochi.
  const level = (input.overall - 74) * 0.09;
  const form = (input.stats.rating - 6.9) * 0.3;
  const leaguePenalty = (input.leagueLevel - 1) * 0.35;
  const loyalty = input.alreadyCapped ? 0.25 : 0;
  const chance = 0.35 + level + form + loyalty - leaguePenalty;

  if (!rng.chance(chance)) return empty;

  const caps = 4 + rng.int(0, 6);
  const scoringRate = input.role === 'FWD' ? 0.4 : input.role === 'MID' ? 0.2 : input.role === 'DEF' ? 0.06 : 0;
  const goals = Math.round(caps * scoringRate * (0.5 + rng.next()));

  const isTournamentYear = input.season % 2 === 0;
  if (!isTournamentYear) return { capped: true, caps, goals, tournament: null };

  // Più sei forte, più lontano arriva la tua nazionale: ma è comunque una lotteria.
  const push = Math.min(0.75, Math.max(0.1, (input.overall - 70) * 0.03));
  let stageIndex = 0;
  for (let i = 0; i < TOURNAMENT_STAGES.length - 1; i += 1) {
    if (rng.chance(push)) stageIndex += 1;
    else break;
  }

  return {
    capped: true,
    caps: caps + 3,
    goals,
    tournament: {
      name: 'Torneo Internazionale',
      stageReached: TOURNAMENT_STAGES[stageIndex]!,
    },
  };
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/national.test.ts`
Expected: 8 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/national.ts tests/engine/national.test.ts
git commit -m "feat: convocazioni in nazionale e tornei internazionali"
```

---

### Task 9: Orchestrazione della stagione

Il modulo che mette in fila tutti i sistemi. Da qui in poi `career.ts` non fa più i conti da solo.

**Files:**
- Modify: `src/engine/types.ts` (arricchire `SeasonRecord`)
- Create: `src/engine/season.ts`
- Test: `tests/engine/season.test.ts`

**Interfaces:**
- Consumes: tutti i moduli dei Task 1-8
- Produces:
  - `simulateSeason(input: SimulateSeasonInput, rng: Rng): SeasonOutcome`
  - `SimulateSeasonInput` = `{ season: number; player: CareerPlayer; club: Club; league: { id: string; name: string; level: number; clubCount: number }; leagueStrengths: readonly number[]; qualifiedToContinental: boolean; candidates: readonly CandidateClub[]; alreadyCapped: boolean }`
  - `SeasonOutcome` = `{ record: SeasonRecord; grownPlayer: CareerPlayer; qualifiedNextSeason: boolean }`

- [ ] **Step 1: Arricchire `SeasonRecord`**

In `src/engine/types.ts`, **sostituire** l'interfaccia `SeasonRecord` con:

```ts
/** Una riga della timeline di carriera. */
export interface SeasonRecord {
  season: number;
  age: number;
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  leagueLevel: number;
  minutesShare: number;
  overallStart: number;
  overallEnd: number;
  stats: SeasonStats;
  /** Posizione finale del club in campionato, 1-based. */
  position: number;
  trophies: Trophy[];
  awards: Award[];
  national: NationalSeason;
  valueEur: number;
  /** Offerte ricevute a fine stagione. */
  offers: Offer[];
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/season.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/engine/create.js';
import { createRng } from '../../src/engine/rng.js';
import { simulateSeason, type SimulateSeasonInput } from '../../src/engine/season.js';
import type { Club, Role, WorldPlayer } from '../../src/world/types.js';

function club(id: string, name: string, overalls: readonly number[]): Club {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `${id}p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id, name, squad };
}

const home = club('home', 'Squadra di Casa', Array.from({ length: 22 }, () => 70));
const rival = club('rival', 'Rivale', Array.from({ length: 22 }, () => 74));

function input(over: Partial<SimulateSeasonInput> = {}): SimulateSeasonInput {
  return {
    season: 1,
    player: createPlayer(
      { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 20, leagueLevel: 1 },
      createRng(1),
    ),
    club: home,
    league: { id: 'lg', name: 'Lega', level: 1, clubCount: 20 },
    leagueStrengths: [78, 76, 74, 72, 70, 68, 66, 64],
    qualifiedToContinental: false,
    candidates: [
      { club: rival, leagueId: 'lg', leagueName: 'Lega', leagueLevel: 1 },
    ],
    alreadyCapped: false,
    ...over,
  };
}

describe('simulateSeason', () => {
  it('produce una riga di carriera completa', () => {
    const { record } = simulateSeason(input(), createRng(1));
    expect(record.season).toBe(1);
    expect(record.clubName).toBe('Squadra di Casa');
    expect(record.leagueName).toBe('Lega');
    expect(record.stats.appearances).toBeGreaterThanOrEqual(0);
    expect(record.position).toBeGreaterThanOrEqual(1);
    expect(record.valueEur).toBeGreaterThan(0);
    expect(Array.isArray(record.trophies)).toBe(true);
    expect(Array.isArray(record.offers)).toBe(true);
  });

  it('il giocatore restituito è invecchiato di un anno', () => {
    const source = input();
    const { grownPlayer } = simulateSeason(source, createRng(2));
    expect(grownPlayer.age).toBe(source.player.age + 1);
    expect(source.player.age).toBe(20); // non muta l'ingresso
  });

  it('chi arriva primo vince il campionato', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const { record } = simulateSeason(input(), createRng(seed));
      const wonLeague = record.trophies.some((trophy) => trophy.kind === 'league');
      expect(wonLeague).toBe(record.position === 1);
    }
  });

  it('arrivare nei primi quattro qualifica alla coppa continentale', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const outcome = simulateSeason(input(), createRng(seed));
      expect(outcome.qualifiedNextSeason).toBe(outcome.record.position <= 4);
    }
  });

  it('il valore di mercato riflette il giocatore a fine stagione', () => {
    const { record, grownPlayer } = simulateSeason(input(), createRng(3));
    expect(record.valueEur).toBeGreaterThan(0);
    expect(grownPlayer.overall).toBeGreaterThan(0);
  });

  it('è deterministico', () => {
    expect(simulateSeason(input(), createRng(9))).toEqual(simulateSeason(input(), createRng(9)));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/season.test.ts`
Expected: FAIL — modulo `season.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/season.ts`:

```ts
import type { Club } from '../world/types.js';
import { resolveAwards } from './awards.js';
import { clubStrengthWith, leaguePosition } from './clubStrength.js';
import { resolveTrophies } from './competitions.js';
import { growPlayer } from './growth.js';
import { generateOffers, type CandidateClub } from './market.js';
import { nationalSeason } from './national.js';
import { playingTimeShare } from './playingTime.js';
import type { Rng } from './rng.js';
import { seasonStats } from './stats.js';
import type { CareerPlayer, SeasonRecord } from './types.js';
import { marketValue } from './value.js';

export interface SimulateSeasonInput {
  season: number;
  player: CareerPlayer;
  club: Club;
  league: { id: string; name: string; level: number; clubCount: number };
  /** Forza di tutti i club del campionato, per la classifica. */
  leagueStrengths: readonly number[];
  qualifiedToContinental: boolean;
  candidates: readonly CandidateClub[];
  alreadyCapped: boolean;
}

export interface SeasonOutcome {
  record: SeasonRecord;
  grownPlayer: CareerPlayer;
  /** I primi quattro giocano la coppa continentale l'anno dopo. */
  qualifiedNextSeason: boolean;
}

const CONTINENTAL_SPOTS = 4;

/** Risolve una stagione intera: campo, classifica, trofei, premi, nazionale, mercato. */
export function simulateSeason(input: SimulateSeasonInput, rng: Rng): SeasonOutcome {
  const { player, club, league } = input;

  const minutesShare = playingTimeShare(
    { overall: player.overall, age: player.age, role: player.role },
    club.squad,
  );
  const strength = clubStrengthWith(club, player.overall, player.role, minutesShare);
  const position = leaguePosition(strength, input.leagueStrengths, rng);

  const stats = seasonStats(
    {
      overall: player.overall,
      role: player.role,
      minutesShare,
      clubStrength: strength,
      leagueLevel: league.level,
    },
    rng,
  );

  const trophies = resolveTrophies(
    {
      season: input.season,
      leagueName: league.name,
      position,
      clubCount: league.clubCount,
      qualifiedToContinental: input.qualifiedToContinental,
      minutesShare,
    },
    rng,
  );

  const awards = resolveAwards(
    {
      season: input.season,
      leagueName: league.name,
      leagueLevel: league.level,
      age: player.age,
      role: player.role,
      stats,
      position,
    },
    rng,
  );

  const national = nationalSeason(
    {
      season: input.season,
      age: player.age,
      overall: player.overall,
      role: player.role,
      stats,
      leagueLevel: league.level,
      alreadyCapped: input.alreadyCapped,
    },
    rng,
  );

  const grownPlayer = growPlayer(player, minutesShare, rng);
  const valueEur = marketValue(grownPlayer.overall, grownPlayer.age, grownPlayer.potential);

  const offers = generateOffers(
    {
      player: {
        overall: grownPlayer.overall,
        age: grownPlayer.age,
        potential: grownPlayer.potential,
        role: grownPlayer.role,
      },
      currentClubId: club.id,
      currentMinutesShare: minutesShare,
      stats,
      candidates: input.candidates,
    },
    rng,
  );

  return {
    record: {
      season: input.season,
      age: player.age,
      clubId: club.id,
      clubName: club.name,
      leagueId: league.id,
      leagueName: league.name,
      leagueLevel: league.level,
      minutesShare,
      overallStart: player.overall,
      overallEnd: grownPlayer.overall,
      stats,
      position,
      trophies,
      awards,
      national,
      valueEur,
      offers,
    },
    grownPlayer,
    qualifiedNextSeason: position <= CONTINENTAL_SPOTS,
  };
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/season.test.ts`
Expected: 6 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/season.ts tests/engine/season.test.ts
git commit -m "feat: orchestrazione di una stagione intera"
```

---

### Task 10: La carriera diventa itinerante

`career.ts` passa da "una squadra per sempre" a una carriera che cambia maglia. È il pezzo che chiude la trappola di D-004.

**Files:**
- Modify: `src/engine/career.ts`
- Modify: `tests/engine/career.test.ts` (i test esistenti vanno adattati alla nuova firma)
- Test: `tests/engine/careerReal.test.ts` (nuovo, sui dati veri)

**Interfaces:**
- Consumes: `simulateSeason`, `shouldRetire`, `createPlayer`, `ambitiousPolicy`, `TransferPolicy`
- Produces:
  - `runCareer(input: RunCareerInput): CareerResult` con `RunCareerInput` = `{ create: CreatePlayerInput; world: CareerWorld; seed: number; policy?: TransferPolicy }`
  - `CareerWorld` = `{ clubs: readonly CandidateClub[]; startClubId: string }`
  - `CareerResult` invariato nei campi esistenti, con in più `clubsPlayed: string[]` e `trophies: Trophy[]` e `awards: Award[]` aggregati

- [ ] **Step 1: Aggiornare `CareerResult` in `src/engine/types.ts`**

```ts
export interface CareerResult {
  player: CareerPlayer;
  seasons: SeasonRecord[];
  peakOverall: number;
  retiredAt: number;
  /** Nomi dei club in cui ha giocato, in ordine, senza ripetizioni consecutive. */
  clubsPlayed: string[];
  trophies: Trophy[];
  awards: Award[];
  peakValueEur: number;
  totalCaps: number;
}
```

- [ ] **Step 2: Scrivere il test sulle rose vere**

`tests/engine/careerReal.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { runCareer } from '../../src/engine/career.js';
import type { CandidateClub } from '../../src/engine/market.js';
import { createFileWorldSource } from '../../src/world/fileSource.js';

describe('carriere sulle rose vere', () => {
  let clubs: CandidateClub[];
  let napoliId: string;

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const leagues = await source.listLeagues();
    const italian = leagues.filter((league) => league.country === 'Italy');
    clubs = [];
    for (const league of italian) {
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
    napoliId = clubs.find((entry) => entry.club.name === 'Napoli')!.club.id;
  });

  it('un ragazzo bloccato in una big finisce per cambiare aria', () => {
    let moved = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      const result = runCareer({
        create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
        world: { clubs, startClubId: napoliId },
        seed,
      });
      if (result.clubsPlayed.length > 1) moved += 1;
    }
    expect(moved).toBeGreaterThan(30);
  });

  it('una carriera vera produce gol, presenze e qualche trofeo', () => {
    const result = runCareer({
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
      world: { clubs, startClubId: napoliId },
      seed: 2026,
    });
    const goals = result.seasons.reduce((sum, season) => sum + season.stats.goals, 0);
    const apps = result.seasons.reduce((sum, season) => sum + season.stats.appearances, 0);
    expect(apps).toBeGreaterThan(100);
    expect(goals).toBeGreaterThan(20);
    expect(result.peakValueEur).toBeGreaterThan(1_000_000);
  });

  it('i minuti medi di una carriera sono da calciatore, non da spettatore', () => {
    let total = 0;
    const careers = 40;
    for (let seed = 0; seed < careers; seed += 1) {
      const result = runCareer({
        create: { name: 'Diego', nationality: 'Italy', role: 'MID', age: 17, leagueLevel: 1 },
        world: { clubs, startClubId: napoliId },
        seed,
      });
      total +=
        result.seasons.reduce((sum, season) => sum + season.minutesShare, 0) /
        result.seasons.length;
    }
    expect(total / careers).toBeGreaterThan(0.45);
  });

  it('è deterministica anche col mercato di mezzo', () => {
    const run = (): unknown =>
      runCareer({
        create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
        world: { clubs, startClubId: napoliId },
        seed: 77,
      });
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
```

- [ ] **Step 3: Eseguire il test e verificare che fallisca**

Run: `npx vitest run tests/engine/careerReal.test.ts`
Expected: FAIL — `runCareer` non accetta ancora `world`.

- [ ] **Step 4: Riscrivere `src/engine/career.ts`**

```ts
import { createPlayer, type CreatePlayerInput } from './create.js';
import { clubStrength } from './clubStrength.js';
import { ambitiousPolicy, type CandidateClub, type TransferPolicy } from './market.js';
import { shouldRetire } from './retirement.js';
import { createRng } from './rng.js';
import { simulateSeason } from './season.js';
import type { Award, CareerResult, SeasonRecord, Trophy } from './types.js';

export interface CareerWorld {
  clubs: readonly CandidateClub[];
  startClubId: string;
}

export interface RunCareerInput {
  create: CreatePlayerInput;
  world: CareerWorld;
  seed: number;
  /** In Fase 4 sarà la scelta dell'utente. */
  policy?: TransferPolicy;
}

const MAX_SEASONS = 30;
/** Quanti club valuta il mercato ogni anno: tutti sarebbe inutilmente costoso. */
const CANDIDATE_SAMPLE = 12;

export function runCareer(input: RunCareerInput): CareerResult {
  const rng = createRng(input.seed);
  const policy = input.policy ?? ambitiousPolicy;

  let current = input.world.clubs.find((entry) => entry.club.id === input.world.startClubId);
  if (!current) throw new Error(`club di partenza non trovato: ${input.world.startClubId}`);

  let player = createPlayer(input.create, rng);
  const seasons: SeasonRecord[] = [];
  const clubsPlayed: string[] = [current.club.name];
  let qualified = false;
  let capped = false;

  // Le forze dei club per campionato non cambiano durante la carriera: si calcolano una volta.
  const strengthsByLeague = new Map<string, number[]>();
  for (const entry of input.world.clubs) {
    const list = strengthsByLeague.get(entry.leagueId) ?? [];
    list.push(clubStrength(entry.club));
    strengthsByLeague.set(entry.leagueId, list);
  }

  while (!player.retired && seasons.length < MAX_SEASONS) {
    const leagueStrengths = strengthsByLeague.get(current.leagueId) ?? [clubStrength(current.club)];

    // Un campione di club diversi dal proprio, stabile a parità di seed.
    const others = input.world.clubs.filter((entry) => entry.club.id !== current!.club.id);
    const candidates: CandidateClub[] = [];
    for (let i = 0; i < Math.min(CANDIDATE_SAMPLE, others.length); i += 1) {
      const picked = others[rng.int(0, others.length - 1)];
      if (picked && !candidates.includes(picked)) candidates.push(picked);
    }

    const outcome = simulateSeason(
      {
        season: seasons.length + 1,
        player,
        club: current.club,
        league: {
          id: current.leagueId,
          name: current.leagueName,
          level: current.leagueLevel,
          clubCount: leagueStrengths.length,
        },
        leagueStrengths,
        qualifiedToContinental: qualified,
        candidates,
        alreadyCapped: capped,
      },
      rng,
    );

    seasons.push(outcome.record);
    qualified = outcome.qualifiedNextSeason;
    capped = capped || outcome.record.national.capped;
    player = outcome.grownPlayer;

    if (shouldRetire(player, outcome.record.minutesShare, rng)) {
      player = { ...player, retired: true };
      break;
    }

    const chosen = policy(outcome.record.offers, {
      currentMinutesShare: outcome.record.minutesShare,
      currentLeagueLevel: current.leagueLevel,
      age: player.age,
    });

    if (chosen) {
      const destination = input.world.clubs.find((entry) => entry.club.id === chosen.clubId);
      if (destination) {
        current = destination;
        if (clubsPlayed[clubsPlayed.length - 1] !== destination.club.name) {
          clubsPlayed.push(destination.club.name);
        }
      }
    }
  }

  if (!player.retired) player = { ...player, retired: true };

  const trophies: Trophy[] = seasons.flatMap((season) => season.trophies);
  const awards: Award[] = seasons.flatMap((season) => season.awards);

  return {
    player,
    seasons,
    peakOverall: seasons.reduce((peak, season) => Math.max(peak, season.overallEnd), 0),
    retiredAt: player.age,
    clubsPlayed,
    trophies,
    awards,
    peakValueEur: seasons.reduce((peak, season) => Math.max(peak, season.valueEur), 0),
    totalCaps: seasons.reduce((sum, season) => sum + season.national.caps, 0),
  };
}
```

- [ ] **Step 5: Riscrivere `tests/engine/career.test.ts` per la nuova firma**

I test di Fase 1 passavano `{ create, club, leagueId, seed }`. Sostituire l'intero file con:

```ts
import { describe, expect, it } from 'vitest';
import { runCareer, type CareerWorld } from '../../src/engine/career.js';
import type { CreatePlayerInput } from '../../src/engine/create.js';
import type { CandidateClub } from '../../src/engine/market.js';
import type { WorldPlayer } from '../../src/world/types.js';

const create: CreatePlayerInput = {
  name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1,
};

/** Un mondo con un club solo: nessuna offerta possibile, quindi la carriera resta lì. */
function world(overalls: readonly number[]): CareerWorld {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `p${index}`, name: `Compagno ${index}`, age: 26, role: 'FWD',
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  const only: CandidateClub = {
    club: { id: 'c1', name: 'Club di prova', squad },
    leagueId: 'serie-a-31', leagueName: 'Serie A', leagueLevel: 1,
  };
  return { clubs: [only], startClubId: 'c1' };
}

const average = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

describe('runCareer', () => {
  it('produce una carriera che finisce col ritiro', () => {
    const result = runCareer({ create, world: world([70, 68]), seed: 1 });
    expect(result.player.retired).toBe(true);
    expect(result.seasons.length).toBeGreaterThan(5);
    expect(result.retiredAt).toBe(result.player.age);
  });

  it("le stagioni sono numerate in ordine e l'età cresce di uno per volta", () => {
    const result = runCareer({ create, world: world([70, 68]), seed: 2 });
    result.seasons.forEach((season, index) => {
      expect(season.season).toBe(index + 1);
      expect(season.age).toBe(create.age + index);
    });
  });

  it('senza offerte si resta nello stesso club per tutta la carriera', () => {
    const result = runCareer({ create, world: world([70]), seed: 3 });
    for (const season of result.seasons) {
      expect(season.clubId).toBe('c1');
      expect(season.clubName).toBe('Club di prova');
      expect(season.leagueId).toBe('serie-a-31');
    }
    expect(result.clubsPlayed).toEqual(['Club di prova']);
  });

  it('il picco di overall è il massimo raggiunto nella carriera', () => {
    const result = runCareer({ create, world: world([70, 68]), seed: 4 });
    const maxFromSeasons = Math.max(...result.seasons.map((season) => season.overallEnd));
    expect(result.peakOverall).toBe(maxFromSeasons);
  });

  it('ogni stagione porta con sé statistiche e valore', () => {
    const result = runCareer({ create, world: world([70, 68]), seed: 5 });
    for (const season of result.seasons) {
      expect(season.stats.appearances).toBeGreaterThanOrEqual(0);
      expect(season.stats.minutes).toBeGreaterThanOrEqual(0);
      expect(season.valueEur).toBeGreaterThan(0);
      expect(season.position).toBeGreaterThanOrEqual(1);
    }
    expect(result.peakValueEur).toBeGreaterThan(0);
  });

  it('è deterministica: stesso seed, carriera identica', () => {
    const a = runCareer({ create, world: world([70, 68]), seed: 99 });
    const b = runCareer({ create, world: world([70, 68]), seed: 99 });
    expect(a).toEqual(b);
  });

  it('seed diversi danno carriere diverse', () => {
    const a = runCareer({ create, world: world([70, 68]), seed: 1 });
    const b = runCareer({ create, world: world([70, 68]), seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('in una squadra fortissima si gioca meno che in una debole', () => {
    const big = runCareer({ create, world: world([92, 90, 89, 88]), seed: 7 });
    const small = runCareer({ create, world: world([58, 55]), seed: 7 });
    expect(average(small.seasons.map((s) => s.minutesShare)))
      .toBeGreaterThan(average(big.seasons.map((s) => s.minutesShare)));
  });

  it('non si ritira mai prima dei 30 anni', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const result = runCareer({ create, world: world([70, 68]), seed });
      expect(result.retiredAt).toBeGreaterThanOrEqual(30);
      expect(result.retiredAt).toBeLessThanOrEqual(41);
    }
  });
});
```

- [ ] **Step 6: Eseguire tutti i test del motore**

Run: `npx vitest run tests/engine/`
Expected: tutti verdi. Se `careerReal` fallisce su «un ragazzo bloccato in una big finisce per cambiare aria», il problema è nella policy o nella generazione di offerte: **non alzare la soglia del test**, è la verifica di D-004.

- [ ] **Step 7: Commit**

```bash
git add src/engine/career.ts src/engine/types.ts tests/engine/career.test.ts tests/engine/careerReal.test.ts
git commit -m "feat: la carriera cambia club, con trofei, premi e nazionale aggregati"
```

---

### Task 11: Il Lab guarda la carriera vera

**Files:**
- Modify: `scripts/lab.ts`

**Interfaces:**
- Consumes: `runCareer` nella nuova forma, `createFileWorldSource`

- [ ] **Step 1: Aggiornare il Lab alla nuova firma e aggiungere le statistiche di gioco**

Prima di tutto aggiungere l'import che serve alla nuova firma:

```ts
import type { CandidateClub } from '../src/engine/market.js';
```

Poi, in `scripts/lab.ts`, sostituire la costruzione del `pool` e la chiamata a `runCareer` con un mondo unico costruito dai campionati caricati:

```ts
  const source = createFileWorldSource('public/world');
  const leagues = await source.listLeagues();
  const selected = leagues.slice(0, 8);
  const clubs: CandidateClub[] = [];
  for (const league of selected) {
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
```

e, dentro il ciclo:

```ts
    const start = clubs[i % clubs.length]!;
    const result = runCareer({
      create: {
        name: `Test ${i}`, nationality: 'Italy', role,
        age: 17, leagueLevel: start.leagueLevel,
      },
      world: { clubs, startClubId: start.club.id },
      seed,
    });
```

- [ ] **Step 2: Aggiungere le statistiche nuove**

Dopo le righe già esistenti su picco e minuti, aggiungere:

```ts
  const goalsPerSeason = results.flatMap((result) =>
    result.seasons.filter((season) => season.stats.appearances >= 15).map((season) => season.stats.goals),
  );
  const withTrophy = results.filter((result) => result.trophies.length > 0).length / results.length;
  const withAward = results.filter((result) => result.awards.length > 0).length / results.length;
  const capped = results.filter((result) => result.totalCaps > 0).length / results.length;
  const clubCounts = results.map((result) => result.clubsPlayed.length);

  console.log(`Gol per stagione da titolare: media ${average(goalsPerSeason).toFixed(1)} | massimo ${Math.max(...goalsPerSeason, 0)}`);
  console.log(`Club per carriera: media ${average(clubCounts).toFixed(1)} (max ${Math.max(...clubCounts)})`);
  console.log(`Carriere con almeno un trofeo: ${(withTrophy * 100).toFixed(1)}% | con almeno un premio: ${(withAward * 100).toFixed(1)}%`);
  console.log(`Carriere con presenze in nazionale: ${(capped * 100).toFixed(1)}%`);
  console.log(`Valore di picco mediano: ${(percentile([...results.map((r) => r.peakValueEur)].sort((a, b) => a - b), 0.5) / 1e6).toFixed(1)}M`);
```

- [ ] **Step 3: Aggiungere le invarianti nuove**

```ts
  if (average(clubCounts) < 1.5) {
    failures.push(`quasi nessuno cambia squadra: media ${average(clubCounts).toFixed(2)} club per carriera`);
  }
  const maxGoals = Math.max(...goalsPerSeason, 0);
  if (maxGoals > 45) {
    failures.push(`stagione irreale da ${maxGoals} gol`);
  }
  if (withTrophy < 0.2) {
    failures.push(`troppo poche carriere con trofei: ${(withTrophy * 100).toFixed(1)}%`);
  }
```

- [ ] **Step 4: Eseguire il Lab**

Run: `npm run lab -- --careers=2000 --seed=42`
Expected: uscita pulita, con le righe nuove popolate.

Da leggere con occhio critico, non solo "è verde": i gol per stagione da titolare devono stare fra 5 e 15 di media, il massimo assoluto sotto i 45, i club per carriera fra 2 e 6.

- [ ] **Step 5: Commit**

```bash
git add scripts/lab.ts
git commit -m "feat: il Lab misura gol, trofei, premi, nazionale e trasferimenti"
```

---

### Task 12: Chiudere D-004

La verifica che la Fase 2 doveva servire a superare. Finché queste due invarianti non valgono, la Fase 2 non è finita.

**Files:**
- Modify: `scripts/lab.ts`
- Modify: `docs/decisions.md`

- [ ] **Step 1: Attivare le due invarianti di D-004**

In `scripts/lab.ts`, aggiungere:

```ts
  // Le due verifiche che la Fase 2 doveva rendere vere (decisione D-004).
  if (benchWarmers > 0.15) {
    failures.push(`troppe carriere da riserva: ${(benchWarmers * 100).toFixed(1)}% (atteso sotto il 15%)`);
  }
  const legends = peaks.filter((peak) => peak >= 85).length / peaks.length;
  if (legends < 0.01) {
    failures.push(`nessuna leggenda: solo ${(legends * 100).toFixed(2)}% supera 85 di picco (atteso almeno l'1%)`);
  }
```

- [ ] **Step 2: Eseguire il Lab e leggere il risultato**

Run: `npm run lab -- --careers=3000 --seed=42`

Se una delle due fallisce, **la correzione va fatta nel motore, non nella soglia**. In ordine di sospetto:

1. `ambitiousPolicy` è troppo prudente e nessuno si muove → guardare "Club per carriera" nel Lab.
2. `generateOffers` non produce offerte per chi non gioca → verificare la condizione `wantsLoan`.
3. La crescita è troppo lenta perché nessuno arriva in un club dove giocherebbe titolare → guardare i minuti medi.

- [ ] **Step 3: Registrare l'esito in `docs/decisions.md`**

Aggiungere una voce `D-006` che riporta i numeri misurati alla fine della Fase 2 e dice se le due condizioni di D-004 sono soddisfatte. Scrivere i numeri veri, anche se deludenti — è il documento su cui si baserà la Fase 3.

- [ ] **Step 4: Verifica finale completa**

```bash
npm run check
npm run lab -- --careers=5000 --seed=1
```

- [ ] **Step 5: Commit**

```bash
git add scripts/lab.ts docs/decisions.md
git commit -m "feat: attivate le invarianti di D-004 sulle riserve e sulle leggende"
```

---

## Verifica finale della Fase 2

```bash
npm run check
npm run lab -- --careers=5000 --seed=1
```

Devono uscire puliti entrambi. Il Lab deve mostrare, su carriere vere: minuti medi sopra 0,55, meno del 15% di riserve perenni, almeno l'1% di carriere sopra 85 di picco, gol per stagione da titolare fra 5 e 15, almeno un trofeo nel 20% delle carriere.

## Cosa NON si costruisce in questa fase

Il Rivale, i bivi con rischio dichiarato, i Segni, il punteggio GOAT, l'interfaccia, il poster, gli infortuni con conseguenze. Sono Fase 3 e Fase 4. In particolare **non** anticipare il sistema dei Segni dentro `season.ts`: nasce in Fase 3 con la sua struttura, e infilarlo qui adesso lo farebbe nascere storto.
