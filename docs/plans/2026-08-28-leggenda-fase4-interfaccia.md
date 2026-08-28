# LEGGENDA — Fase 4: l'interfaccia, e il gioco in mano all'utente

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare il motore in un gioco che si tocca: creazione del calciatore, stagione raccontata come timeline di momenti, bivi con la posta dichiarata, mercato con i minuti attesi, verdetto finale, salvataggi. Al termine di questa fase LEGGENDA si gioca davvero nel browser.

**Architecture:** Il cuore è il **replay deterministico**. L'interfaccia non tiene stato di gioco: conserva solo `{seed, creazione, decisioni}` e, a ogni schermata, rigioca la carriera dall'inizio fermandosi alla prima decisione mancante. Una carriera intera costa meno di un millisecondo, quindi rigiocarla a ogni click è gratis — e in cambio il salvataggio diventa minuscolo, condivisibile e impossibile da corrompere (spec §5.4). Next.js in export statico su Next 16.3.3, nessun server.

**Tech Stack:** Node 24, TypeScript 5.9, vitest 3.2, tsx 4.20 (già presenti) + Next 16.3.3, React 19.2, Playwright per l'end-to-end.

**Spec:** `docs/specs/2026-08-28-leggenda-v1-design.md` (§3.2, §3.5, §5.3, §5.4, §7)
**Fasi precedenti:** piani di Fase 1, 2 e 3 — completate, 259 test verdi
**Decisioni:** `docs/decisions.md` — dodici voci; D-012 spiega perché una carriera va **letta**, non solo misurata

## Global Constraints

- **Determinismo assoluto**: in `src/engine/` restano vietati `Math.random()`, `Date.now()`, `new Date()`. L'interfaccia può usarli (per l'orologio dei salvataggi), il motore mai.
- **Il motore non conosce l'interfaccia**: `src/engine/` non importa nulla da `src/app/` né da React. La dipendenza va in una direzione sola.
- **Il motore non conosce la fonte dati**: continua a valere `WorldSource` (spec §4.2). Nel browser l'implementazione userà `fetch`, ma il motore non lo saprà.
- **Nessuno stato di gioco nei componenti**: l'unico stato è `CareerSave`. Tutto il resto si ricava rigiocando. Un componente che tiene in `useState` l'overall del giocatore è un bug.
- **Mobile prima del desktop**: si progetta sullo schermo stretto. Il concorrente spedisce 3,2 MB in un file solo (D-006 nella spec §2): il nostro primo caricamento deve restare sotto i 300 KB di JavaScript, campionato escluso.
- **Testi di gioco in italiano**, identificatori in inglese.
- **Un commit per task**, messaggio in italiano.

---

## Due lacune del motore da colmare qui

Rileggendo la spec §3.2 contro il codice, due delle cinque battute della stagione non esistono ancora. Non sono lavoro di interfaccia: sono gioco, e vanno costruite prima di poterle mostrare.

1. **La preparazione** (§3.2, punto 2): «una sola scelta: su cosa lavori quest'anno. Quattro assi (tecnica, fisico, testa, leadership). L'effetto è lento e cumulativo: è la build.» I piani 1-3 non l'hanno mai coperta.
2. **La timeline di momenti** (§3.2, punto 3): «l'output non è una tabella ma una timeline di momenti: l'esordio, la doppietta nel derby, la panchina di novembre.» Oggi il motore restituisce solo numeri.

Sono i Task 1 e 2.

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `src/engine/training.ts` | **nuovo** — la scelta di preparazione e i suoi effetti |
| `src/engine/moments.ts` | **nuovo** — da statistiche a momenti raccontati |
| `src/engine/play.ts` | **nuovo** — replay deterministico, decisioni, sospensione |
| `src/engine/save.ts` | **nuovo** — salvataggio come seed + decisioni, codice condivisibile |
| `src/engine/season.ts`, `career.ts`, `types.ts` | **modificare** — allenamento, momenti, sospensione |
| `src/world/fetchSource.ts` | **nuovo** — `WorldSource` per il browser |
| `src/app/layout.tsx`, `page.tsx`, `gioca/page.tsx` | **nuovo** — pagine Next |
| `src/app/globals.css` | **nuovo** — il sistema visivo |
| `src/ui/*.tsx` | **nuovo** — i componenti del gioco |
| `tests/e2e/golden-path.spec.ts` | **nuovo** — una carriera intera dal browser |

---

### Task 1: La preparazione

**Files:**
- Modify: `src/engine/types.ts`, `src/engine/season.ts`
- Create: `src/engine/training.ts`
- Test: `tests/engine/training.test.ts`

**Interfaces:**
- Consumes: `CareerPlayer`, `Mark`
- Produces:
  - `TrainingAxis` = `'tecnica' | 'fisico' | 'testa' | 'leadership'`
  - `TRAINING_AXES: readonly { id: TrainingAxis; label: string; promise: string }[]`
  - `trainingEffect(axis: TrainingAxis): { growthMultiplier: number; physiqueDelta: number; minutesDelta: number; leadershipChance: number }`

Effetti (lenti e cumulativi, come chiede la spec):

| Asse | Effetto |
|---|---|
| tecnica | crescita ×1,25 in questa stagione |
| fisico | +2 di fisico permanenti (meno infortuni, picco più tardi) |
| testa | +5% di minuti in questa stagione |
| leadership | 35% di prendere il Segno `leader-riconosciuto` |

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/training.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TRAINING_AXES, trainingEffect } from '../../src/engine/training.js';

describe('gli assi di allenamento', () => {
  it('sono quattro, come dice la specifica', () => {
    expect(TRAINING_AXES).toHaveLength(4);
    expect(TRAINING_AXES.map((axis) => axis.id)).toEqual([
      'tecnica', 'fisico', 'testa', 'leadership',
    ]);
  });

  it('ognuno dichiara cosa promette, in italiano', () => {
    for (const axis of TRAINING_AXES) {
      expect(axis.label.length).toBeGreaterThan(3);
      expect(axis.promise.length).toBeGreaterThan(15);
    }
  });

  it('la tecnica accelera la crescita e non tocca il resto', () => {
    const effect = trainingEffect('tecnica');
    expect(effect.growthMultiplier).toBeGreaterThan(1);
    expect(effect.physiqueDelta).toBe(0);
    expect(effect.minutesDelta).toBe(0);
  });

  it('il fisico irrobustisce e basta', () => {
    const effect = trainingEffect('fisico');
    expect(effect.physiqueDelta).toBeGreaterThan(0);
    expect(effect.growthMultiplier).toBe(1);
  });

  it('la testa fa guadagnare la fiducia del mister', () => {
    expect(trainingEffect('testa').minutesDelta).toBeGreaterThan(0);
  });

  it('la leadership può far diventare un punto di riferimento', () => {
    expect(trainingEffect('leadership').leadershipChance).toBeGreaterThan(0);
  });

  it('nessun asse è gratis: ognuno rinuncia a quello che danno gli altri', () => {
    for (const axis of TRAINING_AXES) {
      const effect = trainingEffect(axis.id);
      const total =
        (effect.growthMultiplier - 1) + effect.physiqueDelta / 10 +
        effect.minutesDelta * 2 + effect.leadershipChance;
      expect(total).toBeGreaterThan(0.1);
      expect(total).toBeLessThan(0.6);
    }
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/training.test.ts`
Expected: FAIL — modulo `training.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/training.ts`:

```ts
/**
 * La preparazione estiva: una sola scelta all'anno, effetto lento e cumulativo.
 * È la "build" del giocatore (spec §3.2, punto 2).
 */
export type TrainingAxis = 'tecnica' | 'fisico' | 'testa' | 'leadership';

export interface TrainingEffect {
  /** Moltiplicatore della crescita di questa stagione. */
  growthMultiplier: number;
  /** Punti di fisico guadagnati per sempre. */
  physiqueDelta: number;
  /** Minuti in più in questa stagione. */
  minutesDelta: number;
  /** Probabilità di guadagnare il Segno `leader-riconosciuto`. */
  leadershipChance: number;
}

export const TRAINING_AXES: readonly { id: TrainingAxis; label: string; promise: string }[] = [
  {
    id: 'tecnica',
    label: 'Tecnica',
    promise: 'Cresci più in fretta quest\'anno, se giochi abbastanza da metterlo in pratica.',
  },
  {
    id: 'fisico',
    label: 'Fisico',
    promise: 'Ti fai male meno spesso e reggi più a lungo, ma quest\'anno non migliori.',
  },
  {
    id: 'testa',
    label: 'Testa',
    promise: 'Il mister si fida di più: qualche minuto in più, subito.',
  },
  {
    id: 'leadership',
    label: 'Leadership',
    promise: 'Puoi diventare un punto di riferimento dello spogliatoio. O non succedere niente.',
  },
];

const EFFECTS: Record<TrainingAxis, TrainingEffect> = {
  tecnica: { growthMultiplier: 1.25, physiqueDelta: 0, minutesDelta: 0, leadershipChance: 0 },
  fisico: { growthMultiplier: 1, physiqueDelta: 2, minutesDelta: 0, leadershipChance: 0 },
  testa: { growthMultiplier: 1, physiqueDelta: 0, minutesDelta: 0.05, leadershipChance: 0 },
  leadership: { growthMultiplier: 1, physiqueDelta: 0, minutesDelta: 0, leadershipChance: 0.35 },
};

export function trainingEffect(axis: TrainingAxis): TrainingEffect {
  return EFFECTS[axis];
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/training.test.ts`
Expected: 7 test passati.

- [ ] **Step 5: Innestare la preparazione nella stagione**

In `src/engine/season.ts`:

- estendere `SimulateSeasonInput` con `training: TrainingAxis;`
- in cima al file: `import { trainingEffect, type TrainingAxis } from './training.js';`
- subito dopo il calcolo di `adjustedShare`, applicare i minuti dell'allenamento:

```ts
  const training = trainingEffect(input.training);
  const trainedShare = Math.min(0.95, Math.max(0.02, adjustedShare + training.minutesDelta));
```

e usare `trainedShare` al posto di `adjustedShare` da lì in avanti (infortunio, minuti, crescita).

- prima di `growPlayer`, applicare fisico e crescita:

```ts
  const trainedPlayer: CareerPlayer = {
    ...afterChoices,
    physique: Math.min(99, afterChoices.physique + training.physiqueDelta),
  };
  const grownPlayer = growPlayer(trainedPlayer, growthShare * training.growthMultiplier, rng);
```

- dopo i bivi, la leadership:

```ts
  if (training.leadershipChance > 0 && rng.chance(training.leadershipChance)) {
    state = applyEffects(state, { addMark: { id: 'leader-riconosciuto', intensity: 0.5 } }, input.season);
  }
```

- [ ] **Step 6: Propagare a chiamanti e test**

`career.ts`, `rival.ts` e gli helper dei test devono passare `training`. Il Rivale si allena da solo: usare `'tecnica'` finché è giovane e `'fisico'` dopo i 30:

```ts
      training: state.player.age >= 30 ? 'fisico' : 'tecnica',
```

Negli helper di `tests/engine/season.test.ts` e `tests/engine/seasonDilemmas.test.ts` aggiungere `training: 'tecnica',`.

In `career.ts` la scelta arriverà dall'utente (Task 3): per ora aggiungere a `RunCareerInput` il campo opzionale `trainingPolicy?: (season: number) => TrainingAxis` con default `() => 'tecnica'`, e passarlo a `simulateSeason`.

- [ ] **Step 7: Verificare tutto il motore**

Run: `npx vitest run tests/engine/ && npx tsc --noEmit`
Expected: verde.

- [ ] **Step 8: Commit**

```bash
git add src/engine/ tests/engine/
git commit -m "feat: la preparazione estiva, quinta battuta della stagione"
```

---

### Task 2: I momenti

Il pezzo che trasforma una tabella in una storia (spec §3.2, punto 3).

**Files:**
- Create: `src/engine/moments.ts`
- Test: `tests/engine/moments.test.ts`

**Interfaces:**
- Consumes: `SeasonRecord`, `RivalSnapshot`
- Produces:
  - `MomentTone` = `'alto' | 'basso' | 'neutro'`
  - `Moment` = `{ id: string; tone: MomentTone; text: string }`
  - `seasonMoments(input: MomentsInput): Moment[]`
  - `MomentsInput` = `{ record: SeasonRecord; isFirstSeason: boolean; previous: SeasonRecord | undefined; playerName: string }`

I momenti si ricavano **dai fatti della stagione**, senza casualità aggiuntiva: stesso record, stessi momenti. Da 2 a 5 per stagione, in ordine di importanza.

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/moments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { seasonMoments } from '../../src/engine/moments.js';
import type { SeasonRecord } from '../../src/engine/types.js';

function record(over: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    season: 3, age: 22, clubId: 'c', clubName: 'Atalanta', leagueId: 'lg', leagueName: 'Serie A',
    leagueLevel: 1, minutesShare: 0.7, overallStart: 68, overallEnd: 71,
    stats: { appearances: 30, minutes: 2400, goals: 9, assists: 4, cleanSheets: 0, rating: 6.9 },
    position: 6, trophies: [], awards: [],
    national: { capped: false, caps: 0, goals: 0, tournament: null },
    valueEur: 8_000_000, offers: [], injury: null, choices: [], marks: [],
    ...over,
  };
}

const base = { record: record(), isFirstSeason: false, previous: undefined, playerName: 'Diego' };

describe('seasonMoments', () => {
  it('non lascia mai una stagione senza racconto', () => {
    const moments = seasonMoments(base);
    expect(moments.length).toBeGreaterThanOrEqual(2);
    expect(moments.length).toBeLessThanOrEqual(5);
    for (const moment of moments) expect(moment.text.length).toBeGreaterThan(15);
  });

  it("la prima stagione racconta l'esordio", () => {
    const moments = seasonMoments({ ...base, isFirstSeason: true });
    expect(moments.some((moment) => moment.id === 'esordio')).toBe(true);
  });

  it('un titolo di campione è il momento più alto della stagione', () => {
    const moments = seasonMoments({
      ...base,
      record: record({
        position: 1,
        trophies: [{ kind: 'league', season: 3, competitionName: 'Serie A' }],
      }),
    });
    expect(moments[0]?.id).toBe('trofeo');
    expect(moments[0]?.tone).toBe('alto');
  });

  it('un infortunio grave viene raccontato', () => {
    const moments = seasonMoments({
      ...base,
      record: record({ injury: { severity: 'grave', matchesOut: 26, season: 3 } }),
    });
    const injury = moments.find((moment) => moment.id === 'infortunio');
    expect(injury).toBeDefined();
    expect(injury?.tone).toBe('basso');
    expect(injury?.text).toContain('26');
  });

  it('una stagione da riserva non viene spacciata per un successo', () => {
    const moments = seasonMoments({
      ...base,
      record: record({
        minutesShare: 0.06,
        stats: { appearances: 4, minutes: 150, goals: 0, assists: 0, cleanSheets: 0, rating: 6 },
      }),
    });
    expect(moments.some((moment) => moment.tone === 'basso')).toBe(true);
  });

  it('un salto di rendimento rispetto all\'anno prima viene notato', () => {
    const moments = seasonMoments({
      ...base,
      record: record({ stats: { appearances: 34, minutes: 3000, goals: 22, assists: 6, cleanSheets: 0, rating: 7.5 } }),
      previous: record({ stats: { appearances: 30, minutes: 2000, goals: 5, assists: 2, cleanSheets: 0, rating: 6.4 } }),
    });
    expect(moments.some((moment) => moment.id === 'esplosione')).toBe(true);
  });

  it('i premi individuali compaiono', () => {
    const moments = seasonMoments({
      ...base,
      record: record({ awards: [{ kind: 'topScorer', season: 3, competitionName: 'Serie A' }] }),
    });
    expect(moments.some((moment) => moment.id === 'premio')).toBe(true);
  });

  it('la convocazione in nazionale è un momento', () => {
    const moments = seasonMoments({
      ...base,
      record: record({ national: { capped: true, caps: 7, goals: 2, tournament: null } }),
    });
    expect(moments.some((moment) => moment.id === 'nazionale')).toBe(true);
  });

  it('è deterministico: stessi fatti, stesso racconto', () => {
    expect(seasonMoments(base)).toEqual(seasonMoments(base));
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/moments.test.ts`
Expected: FAIL — modulo `moments.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/moments.ts`:

```ts
import type { SeasonRecord } from './types.js';

export type MomentTone = 'alto' | 'basso' | 'neutro';

export interface Moment {
  id: string;
  tone: MomentTone;
  text: string;
}

export interface MomentsInput {
  record: SeasonRecord;
  isFirstSeason: boolean;
  previous: SeasonRecord | undefined;
  playerName: string;
}

const MAX_MOMENTS = 5;
const MIN_MOMENTS = 2;

/**
 * Da una stagione di numeri a una manciata di momenti raccontati (spec §3.2).
 * Nessuna casualità: gli stessi fatti producono sempre lo stesso racconto, così una
 * carriera rigiocata dal suo seed si legge identica.
 */
export function seasonMoments(input: MomentsInput): Moment[] {
  const { record } = input;
  const stats = record.stats;
  const moments: { weight: number; moment: Moment }[] = [];

  const add = (weight: number, id: string, tone: MomentTone, text: string): void => {
    moments.push({ weight, moment: { id, tone, text } });
  };

  if (record.trophies.length > 0) {
    const names = record.trophies.map((trophy) => trophy.competitionName).join(' e ');
    add(100, 'trofeo', 'alto', `${names}: quest'anno c'è una medaglia in più, e tu c'eri.`);
  }

  if (record.awards.length > 0) {
    add(90, 'premio', 'alto', `Riconoscimento individuale: quest'anno il tuo nome è stato letto sul palco.`);
  }

  if (input.isFirstSeason) {
    add(85, 'esordio', 'neutro', `Esordio con ${record.clubName}: ${stats.appearances} presenze da ragazzo in prima squadra.`);
  }

  if (record.injury) {
    const tone: MomentTone = record.injury.severity === 'lieve' ? 'neutro' : 'basso';
    add(80, 'infortunio', tone, `Infortunio ${record.injury.severity}: ${record.injury.matchesOut} partite a guardare gli altri.`);
  }

  const previousGoals = input.previous?.stats.goals ?? 0;
  if (stats.goals >= previousGoals + 8 && stats.goals >= 12) {
    add(75, 'esplosione', 'alto', `${stats.goals} gol dopo i ${previousGoals} dell'anno prima: la stagione in cui tutti hanno imparato il tuo nome.`);
  }

  if (record.national.capped) {
    const tournament = record.national.tournament
      ? `, e col torneo internazionale fino a ${record.national.tournament.stageReached}`
      : '';
    add(70, 'nazionale', 'alto', `Nazionale: ${record.national.caps} presenze${tournament}.`);
  }

  if (record.position === 1) {
    add(65, 'primo-posto', 'alto', `${record.clubName} chiude in testa a ${record.leagueName}.`);
  } else if (record.position >= 18) {
    add(60, 'lotta-salvezza', 'basso', `Stagione passata a guardare in basso: ${record.position}° posto.`);
  }

  if (record.minutesShare < 0.2) {
    add(55, 'panchina', 'basso', `Un anno di panchina: ${stats.appearances} presenze e pochi minuti veri.`);
  } else if (record.minutesShare > 0.75) {
    add(40, 'titolare', 'neutro', `Titolare inamovibile: ${stats.appearances} presenze, ${stats.minutes} minuti.`);
  }

  if (stats.goals > 0 || stats.assists > 0) {
    add(35, 'numeri', 'neutro', `${stats.goals} gol e ${stats.assists} assist, con una media voto di ${stats.rating.toFixed(1)}.`);
  }

  if (stats.cleanSheets >= 10) {
    add(45, 'porta-inviolata', 'alto', `${stats.cleanSheets} volte la porta è rimasta inviolata.`);
  }

  const growth = record.overallEnd - record.overallStart;
  if (growth >= 3) {
    add(30, 'crescita', 'alto', `Un altro passo avanti: sei cresciuto di ${growth} punti.`);
  } else if (growth <= -3) {
    add(30, 'declino', 'basso', `Le gambe cominciano a dire qualcosa: ${growth} punti in un anno.`);
  }

  if (moments.length < MIN_MOMENTS) {
    add(10, 'ordinaria', 'neutro', `Una stagione senza scosse con ${record.clubName}: ${stats.appearances} presenze.`);
  }

  return moments
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_MOMENTS)
    .map((entry) => entry.moment);
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/moments.test.ts`
Expected: 9 test passati.

- [ ] **Step 5: Commit**

```bash
git add src/engine/moments.ts tests/engine/moments.test.ts
git commit -m "feat: la stagione raccontata come timeline di momenti"
```

---

### Task 3: Il replay deterministico

Il pezzo su cui poggia tutta l'interfaccia, e insieme il salvataggio a seed della spec §5.4.

**Files:**
- Modify: `src/engine/career.ts`, `src/engine/types.ts`
- Create: `src/engine/play.ts`
- Test: `tests/engine/play.test.ts`

**Interfaces:**
- Consumes: `runCareer`, `Dilemma`, `Offer`, `TrainingAxis`
- Produces:
  - `CareerDecisions` = `{ training: Record<string, TrainingAxis>; dilemmas: Record<string, string>; transfers: Record<string, string> }` — chiavi stringa perché finiscono in JSON
  - `CareerSave` = `{ version: number; seed: number; create: CreatePlayerInput; startClubId: string; decisions: CareerDecisions }`
  - `Pending` = `{ kind: 'training'; season: number } | { kind: 'dilemma'; season: number; dilemma: Dilemma } | { kind: 'transfer'; season: number; offers: Offer[] } | null`
  - `PlayState` = `{ seasons: SeasonRecord[]; pending: Pending; finished: boolean; result: CareerResult | null }`
  - `playCareer(save: CareerSave, clubs: readonly CandidateClub[]): PlayState`
  - `decisionKey(season: number, dilemmaId: string): string`

Come funziona: le policy consultano le decisioni registrate; se manca quella che serve, lanciano `DecisionRequired`, che `playCareer` cattura restituendo lo stato parziale con `pending` valorizzato. Rigiocare dall'inizio a ogni schermata costa meno di un millisecondo.

- [ ] **Step 1: Preparare `career.ts` alla sospensione**

Aggiungere in cima a `src/engine/career.ts`:

```ts
import type { Dilemma, Offer } from './types.js';
import type { TrainingAxis } from './training.js';

/** Cosa il motore sta aspettando dall'utente. */
export type PendingDecision =
  | { kind: 'training'; season: number }
  | { kind: 'dilemma'; season: number; dilemma: Dilemma }
  | { kind: 'transfer'; season: number; offers: Offer[] };

/**
 * Lanciata dalle politiche quando la decisione non è stata ancora presa.
 * Interrompe la carriera in un punto ben definito, senza stato mutabile di mezzo.
 */
export class DecisionRequired extends Error {
  constructor(readonly pending: PendingDecision) {
    super(`decisione richiesta: ${pending.kind}`);
    this.name = 'DecisionRequired';
  }
}
```

Estendere `RunCareerInput` con:

```ts
  /** Chiamata a ogni stagione conclusa: serve a raccogliere lo stato anche se poi si sospende. */
  onSeason?: (record: SeasonRecord) => void;
```

e invocarla subito dopo `seasons.push(outcome.record)`:

```ts
    input.onSeason?.(outcome.record);
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/play.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import type { CandidateClub } from '../../src/engine/market.js';
import { decisionKey, playCareer, type CareerSave } from '../../src/engine/play.js';
import { createFileWorldSource } from '../../src/world/fileSource.js';

describe('playCareer', () => {
  let clubs: CandidateClub[];
  let save: CareerSave;

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const leagues = await source.listLeagues();
    clubs = [];
    for (const league of leagues.slice(0, 4)) {
      const bundle = await source.loadLeague(league.id);
      for (const club of bundle.clubs) {
        clubs.push({ club, leagueId: league.id, leagueName: league.name, leagueLevel: league.level });
      }
    }
    save = {
      version: 1,
      seed: 2026,
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
      startClubId: clubs[0]!.club.id,
      decisions: { training: {}, dilemmas: {}, transfers: {} },
    };
  });

  it('una carriera appena creata chiede subito la preparazione', () => {
    const state = playCareer(save, clubs);
    expect(state.pending?.kind).toBe('training');
    expect(state.pending?.season).toBe(1);
    expect(state.seasons).toHaveLength(0);
    expect(state.finished).toBe(false);
  });

  it('scelta la preparazione, la prima stagione si gioca', () => {
    const withTraining: CareerSave = {
      ...save,
      decisions: { ...save.decisions, training: { '1': 'tecnica' } },
    };
    const state = playCareer(withTraining, clubs);
    expect(state.seasons.length).toBeGreaterThanOrEqual(1);
    expect(state.seasons[0]?.season).toBe(1);
  });

  it('si ferma sui bivi e dice quale', () => {
    let current: CareerSave = {
      ...save,
      decisions: { ...save.decisions, training: { '1': 'tecnica' } },
    };
    let state = playCareer(current, clubs);
    // Andiamo avanti finché non incontriamo un bivio.
    for (let guard = 0; guard < 20 && state.pending?.kind !== 'dilemma'; guard += 1) {
      if (state.pending?.kind === 'training') {
        current = {
          ...current,
          decisions: {
            ...current.decisions,
            training: { ...current.decisions.training, [String(state.pending.season)]: 'tecnica' },
          },
        };
      } else if (state.pending?.kind === 'transfer') {
        current = {
          ...current,
          decisions: {
            ...current.decisions,
            transfers: { ...current.decisions.transfers, [String(state.pending.season)]: 'resta' },
          },
        };
      } else break;
      state = playCareer(current, clubs);
    }
    expect(state.pending?.kind).toBe('dilemma');
    if (state.pending?.kind === 'dilemma') {
      expect(state.pending.dilemma.options.length).toBeGreaterThanOrEqual(2);
      expect(state.pending.dilemma.title.length).toBeGreaterThan(3);
    }
  });

  it('la stessa scelta produce sempre la stessa carriera', () => {
    const decided: CareerSave = {
      ...save,
      decisions: { ...save.decisions, training: { '1': 'fisico' } },
    };
    expect(JSON.stringify(playCareer(decided, clubs)))
      .toBe(JSON.stringify(playCareer(decided, clubs)));
  });

  it('cambiare una decisione cambia la carriera da lì in avanti', () => {
    const a = playCareer({ ...save, decisions: { ...save.decisions, training: { '1': 'tecnica' } } }, clubs);
    const b = playCareer({ ...save, decisions: { ...save.decisions, training: { '1': 'leadership' } } }, clubs);
    expect(JSON.stringify(a.seasons)).not.toBe(JSON.stringify(b.seasons));
  });

  it('con tutte le decisioni prese la carriera arriva in fondo', () => {
    let current = save;
    let state = playCareer(current, clubs);
    for (let guard = 0; guard < 300 && !state.finished; guard += 1) {
      const pending = state.pending;
      if (!pending) break;
      if (pending.kind === 'training') {
        current = { ...current, decisions: { ...current.decisions, training: { ...current.decisions.training, [String(pending.season)]: 'tecnica' } } };
      } else if (pending.kind === 'dilemma') {
        current = { ...current, decisions: { ...current.decisions, dilemmas: { ...current.decisions.dilemmas, [decisionKey(pending.season, pending.dilemma.id)]: pending.dilemma.options[0]!.id } } };
      } else {
        current = { ...current, decisions: { ...current.decisions, transfers: { ...current.decisions.transfers, [String(pending.season)]: 'resta' } } };
      }
      state = playCareer(current, clubs);
    }
    expect(state.finished).toBe(true);
    expect(state.result).not.toBeNull();
    expect(state.result?.goat.total).toBeGreaterThan(0);
    expect(state.pending).toBeNull();
  });

  it('rigiocare una carriera finita è veloce', () => {
    const start = performance.now();
    for (let i = 0; i < 20; i += 1) playCareer(save, clubs);
    // Venti replay devono stare largamente sotto il secondo: è ciò che rende
    // sostenibile ricalcolare tutto a ogni schermata.
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/play.test.ts`
Expected: FAIL — modulo `play.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/play.ts`:

```ts
import { DecisionRequired, runCareer, type PendingDecision } from './career.js';
import type { CreatePlayerInput } from './create.js';
import type { CandidateClub } from './market.js';
import type { TrainingAxis } from './training.js';
import type { CareerResult, SeasonRecord } from './types.js';

/** Le decisioni prese dall'utente. Chiavi stringa: finiscono in JSON. */
export interface CareerDecisions {
  training: Record<string, TrainingAxis>;
  dilemmas: Record<string, string>;
  /** Per stagione: l'id del club scelto, oppure 'resta'. */
  transfers: Record<string, string>;
}

/**
 * Tutto il salvataggio: un seed e la lista delle scelte.
 * Pesa meno di un SMS e ricostruisce la carriera esatta (spec §5.4).
 */
export interface CareerSave {
  version: number;
  seed: number;
  create: CreatePlayerInput;
  startClubId: string;
  decisions: CareerDecisions;
}

export type Pending = PendingDecision | null;

export interface PlayState {
  seasons: SeasonRecord[];
  pending: Pending;
  finished: boolean;
  result: CareerResult | null;
}

export function decisionKey(season: number, dilemmaId: string): string {
  return `${season}:${dilemmaId}`;
}

/**
 * Rigioca la carriera dal seed e dalle decisioni registrate, fermandosi alla prima
 * decisione mancante. È il cuore dell'interfaccia: nessuno stato mutabile, solo una
 * funzione pura dallo stesso salvataggio alla stessa schermata.
 */
export function playCareer(save: CareerSave, clubs: readonly CandidateClub[]): PlayState {
  const seasons: SeasonRecord[] = [];

  try {
    const result = runCareer({
      create: save.create,
      world: { clubs, startClubId: save.startClubId },
      seed: save.seed,
      onSeason: (record) => seasons.push(record),
      trainingPolicy: (season) => {
        const chosen = save.decisions.training[String(season)];
        if (!chosen) throw new DecisionRequired({ kind: 'training', season });
        return chosen;
      },
      dilemmaPolicy: (dilemma, context) => {
        const chosen = save.decisions.dilemmas[decisionKey(context.season, dilemma.id)];
        const option = dilemma.options.find((item) => item.id === chosen);
        if (!option) throw new DecisionRequired({ kind: 'dilemma', season: context.season, dilemma });
        return option;
      },
      policy: (offers, context) => {
        const season = context.season;
        const chosen = save.decisions.transfers[String(season)];
        if (chosen === undefined) {
          throw new DecisionRequired({ kind: 'transfer', season, offers: [...offers] });
        }
        if (chosen === 'resta') return null;
        return offers.find((offer) => offer.clubId === chosen) ?? null;
      },
    });

    return { seasons, pending: null, finished: true, result };
  } catch (error) {
    if (error instanceof DecisionRequired) {
      return { seasons, pending: error.pending, finished: false, result: null };
    }
    throw error;
  }
}
```

- [ ] **Step 5: Adeguare `career.ts` alle firme richieste**

`TransferPolicy` non riceve ancora la stagione, che serve a indicizzare le decisioni. In `src/engine/market.ts`, aggiungere `season: number;` a `TransferContext`, e in `career.ts` passarlo:

```ts
      const chosen = policy(outcome.record.offers, {
        currentMinutesShare: outcome.record.minutesShare,
        currentLeagueLevel: club.leagueLevel,
        age: player.age,
        season,
      });
```

`ambitiousPolicy` ignora il campo nuovo: nessuna modifica alla sua logica. Aggiornare l'oggetto `context` nei test di `transferPolicy.test.ts` con `season: 5,`.

Aggiungere inoltre a `RunCareerInput` il campo `trainingPolicy?: (season: number) => TrainingAxis` (default `() => 'tecnica'`), e usarlo nella chiamata a `simulateSeason`:

```ts
        training: (input.trainingPolicy ?? (() => 'tecnica' as const))(season),
```

- [ ] **Step 6: Eseguire i test**

Run: `npx vitest run tests/engine/ && npx tsc --noEmit`
Expected: verde, compresi i 7 nuovi di `play.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/engine/ tests/engine/
git commit -m "feat: replay deterministico, il salvataggio e' il seed piu' le decisioni"
```

---

### Task 4: Salvataggi e codice condivisibile

**Files:**
- Create: `src/engine/save.ts`
- Test: `tests/engine/save.test.ts`

**Interfaces:**
- Consumes: `CareerSave`
- Produces:
  - `SAVE_VERSION = 1`
  - `encodeSave(save: CareerSave): string` — testo compatto e incollabile
  - `decodeSave(code: string): CareerSave` — lancia su codice non valido o di versione diversa
  - `isSupportedSave(save: unknown): save is CareerSave`

Il codice è JSON compresso in base64url: nessuna dipendenza, e resta leggibile da qualunque strumento. La versione serve a rifiutare salvataggi nati con un motore che simulava diversamente (spec §5.4).

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/save.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave, isSupportedSave, SAVE_VERSION } from '../../src/engine/save.js';
import type { CareerSave } from '../../src/engine/play.js';

const save: CareerSave = {
  version: SAVE_VERSION,
  seed: 2026,
  create: { name: 'Diego Trovato', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
  startClubId: 'c123',
  decisions: {
    training: { '1': 'tecnica', '2': 'fisico' },
    dilemmas: { '2:panchina-lunga': 'parla' },
    transfers: { '3': 'c456' },
  },
};

describe('encodeSave e decodeSave', () => {
  it('un salvataggio sopravvive al giro completo', () => {
    expect(decodeSave(encodeSave(save))).toEqual(save);
  });

  it('il codice è breve abbastanza da incollarlo in chat', () => {
    expect(encodeSave(save).length).toBeLessThan(600);
  });

  it('il codice non contiene caratteri che si rompono in un URL', () => {
    expect(encodeSave(save)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('un codice inventato viene rifiutato con un messaggio chiaro', () => {
    expect(() => decodeSave('non-e-un-codice')).toThrow('codice non valido');
  });

  it('un salvataggio di una versione diversa viene rifiutato', () => {
    const older = encodeSave({ ...save, version: SAVE_VERSION + 1 });
    expect(() => decodeSave(older)).toThrow('versione');
  });

  it('nomi con accenti e spazi sopravvivono', () => {
    const accented: CareerSave = {
      ...save,
      create: { ...save.create, name: 'Niccolò D\'Amico', nationality: 'Italy' },
    };
    expect(decodeSave(encodeSave(accented)).create.name).toBe('Niccolò D\'Amico');
  });
});

describe('isSupportedSave', () => {
  it('riconosce un salvataggio buono', () => {
    expect(isSupportedSave(save)).toBe(true);
  });

  it('rifiuta oggetti che non lo sono', () => {
    expect(isSupportedSave(null)).toBe(false);
    expect(isSupportedSave({})).toBe(false);
    expect(isSupportedSave({ ...save, decisions: undefined })).toBe(false);
    expect(isSupportedSave({ ...save, version: 99 })).toBe(false);
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/save.test.ts`
Expected: FAIL — modulo `save.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/save.ts`:

```ts
import type { CareerSave } from './play.js';

/** Sale a ogni modifica del motore che cambia l'esito di una simulazione (spec §5.4). */
export const SAVE_VERSION = 1;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const padded = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function isSupportedSave(value: unknown): value is CareerSave {
  if (typeof value !== 'object' || value === null) return false;
  const save = value as Partial<CareerSave>;
  return (
    save.version === SAVE_VERSION &&
    typeof save.seed === 'number' &&
    typeof save.startClubId === 'string' &&
    typeof save.create === 'object' && save.create !== null &&
    typeof save.decisions === 'object' && save.decisions !== null &&
    typeof save.decisions.training === 'object' &&
    typeof save.decisions.dilemmas === 'object' &&
    typeof save.decisions.transfers === 'object'
  );
}

export function encodeSave(save: CareerSave): string {
  return toBase64Url(JSON.stringify(save));
}

export function decodeSave(code: string): CareerSave {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(code.trim()));
  } catch {
    throw new Error('codice non valido: non è un salvataggio di LEGGENDA');
  }
  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
    const version = (parsed as { version: unknown }).version;
    if (version !== SAVE_VERSION) {
      throw new Error(`versione del salvataggio non supportata: ${String(version)}`);
    }
  }
  if (!isSupportedSave(parsed)) {
    throw new Error('codice non valido: non è un salvataggio di LEGGENDA');
  }
  return parsed;
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/save.test.ts`
Expected: 9 test passati. `btoa`/`atob` esistono sia in Node 24 sia nel browser.

- [ ] **Step 5: Commit**

```bash
git add src/engine/save.ts tests/engine/save.test.ts
git commit -m "feat: salvataggio come codice condivisibile, con versione"
```

---

### Task 5: Impalcatura Next.js e mondo via fetch

**Files:**
- Modify: `package.json`, `tsconfig.json`
- Create: `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/world/fetchSource.ts`
- Test: `tests/world/fetchSource.test.ts`

**Interfaces:**
- Produces: `createFetchWorldSource(baseUrl: string): WorldSource`; comandi `npm run dev`, `npm run build`

- [ ] **Step 1: Installare le dipendenze**

```bash
npm install next@16.3.3 react@19.2.8 react-dom@19.2.8
npm install -D @types/react@^19 @types/react-dom@^19
```

- [ ] **Step 2: Aggiungere gli script a `package.json`**

```json
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
```

e aggiornare `verify`:

```json
    "verify": "npm run check && npm run build && npm run lab -- --careers=2000 --seed=42 && npm run lab:choices -- --careers=100"
```

- [ ] **Step 3: Creare `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Sito completamente statico: nessun server, pubblicabile su Netlify (spec §5.3).
  output: 'export',
  images: { unoptimized: true },
};

export default config;
```

- [ ] **Step 4: Aggiornare `tsconfig.json`**

Aggiungere alle `compilerOptions`:

```json
    "jsx": "preserve",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["node", "react"],
    "allowJs": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
```

e a `include`: `"next-env.d.ts"`, `".next/types/**/*.ts"`.

- [ ] **Step 5: Scrivere il test della sorgente via fetch**

`tests/world/fetchSource.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createFetchWorldSource } from '../../src/world/fetchSource.js';
import type { LeagueBundle, LeagueSummary } from '../../src/world/types.js';

const index: LeagueSummary[] = [
  { id: 'serie-a-31', name: 'Serie A', country: 'Italy', level: 1, clubCount: 20 },
];
const bundle: LeagueBundle = {
  league: index[0]!,
  clubs: [{ id: 'c1', name: 'Napoli', squad: [] }],
};

function fakeFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('index.json')) {
      return new Response(JSON.stringify(index), { status: 200 });
    }
    if (url.endsWith('serie-a-31.json')) {
      return new Response(JSON.stringify(bundle), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
}

describe('createFetchWorldSource', () => {
  it('scarica l\'indice dei campionati', async () => {
    const source = createFetchWorldSource('/world', fakeFetch());
    expect(await source.listLeagues()).toEqual(index);
  });

  it('scarica un campionato', async () => {
    const source = createFetchWorldSource('/world', fakeFetch());
    expect((await source.loadLeague('serie-a-31')).clubs[0]?.name).toBe('Napoli');
  });

  it('scarica ogni campionato una volta sola', async () => {
    const spy = fakeFetch();
    const source = createFetchWorldSource('/world', spy);
    await source.loadLeague('serie-a-31');
    await source.loadLeague('serie-a-31');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('su campionato inesistente lancia un errore leggibile', async () => {
    const source = createFetchWorldSource('/world', fakeFetch());
    await expect(source.loadLeague('non-esiste')).rejects.toThrow('campionato non trovato');
  });
});
```

- [ ] **Step 6: Implementare `src/world/fetchSource.ts`**

```ts
import type { WorldSource } from './source.js';
import type { LeagueBundle, LeagueSummary } from './types.js';

/**
 * La stessa interfaccia della sorgente da filesystem, ma per il browser.
 * Ogni campionato pesa una cinquantina di kilobyte e si scarica solo quando serve:
 * è la risposta ai 3,2 MB in un file solo del concorrente (spec §2, D-005).
 */
export function createFetchWorldSource(baseUrl: string, fetchImpl: typeof fetch = fetch): WorldSource {
  let indexCache: LeagueSummary[] | undefined;
  const leagueCache = new Map<string, LeagueBundle>();

  return {
    async listLeagues(): Promise<LeagueSummary[]> {
      if (!indexCache) {
        const response = await fetchImpl(`${baseUrl}/index.json`);
        if (!response.ok) throw new Error('indice dei campionati non raggiungibile');
        indexCache = (await response.json()) as LeagueSummary[];
      }
      return indexCache;
    },

    async loadLeague(leagueId: string): Promise<LeagueBundle> {
      const cached = leagueCache.get(leagueId);
      if (cached) return cached;
      const response = await fetchImpl(`${baseUrl}/leagues/${leagueId}.json`);
      if (!response.ok) throw new Error(`campionato non trovato: ${leagueId}`);
      const bundle = (await response.json()) as LeagueBundle;
      leagueCache.set(leagueId, bundle);
      return bundle;
    },
  };
}
```

- [ ] **Step 7: Il sistema visivo**

`src/app/globals.css`:

```css
/*
 * Il colore del gioco: notte da stadio. Fondo profondo, verde campo, giallo tabellone.
 * Tutto in variabili: il tema si cambia in un punto solo.
 */
:root {
  --fondo: #0b1015;
  --fondo-alto: #131b23;
  --bordo: #223040;
  --testo: #eef3f7;
  --testo-tenue: #93a4b5;
  --campo: #1f9d55;
  --tabellone: #f5c518;
  --allarme: #e05252;
  --raggio: 12px;
  --colonna: 34rem;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--fondo);
  color: var(--testo);
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 17px;
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
}

main { max-width: var(--colonna); margin: 0 auto; padding: 1.25rem 1rem 4rem; }

h1, h2, h3 { line-height: 1.15; margin: 0 0 .5rem; letter-spacing: -.02em; }
h1 { font-size: 1.9rem; }
h2 { font-size: 1.35rem; }

.tenue { color: var(--testo-tenue); }
.numero { font-variant-numeric: tabular-nums; }

.card {
  background: var(--fondo-alto);
  border: 1px solid var(--bordo);
  border-radius: var(--raggio);
  padding: 1rem;
  margin-bottom: .9rem;
}

.bottone {
  display: block;
  width: 100%;
  padding: .85rem 1rem;
  border: 1px solid var(--bordo);
  border-radius: var(--raggio);
  background: var(--fondo-alto);
  color: var(--testo);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.bottone:hover, .bottone:focus-visible { border-color: var(--campo); }
.bottone-forte { background: var(--campo); border-color: var(--campo); font-weight: 600; text-align: center; }
.bottone-forte:hover { filter: brightness(1.08); }

/* La posta dichiarata di ogni scelta: è il cuore del gioco, si vede. */
.posta { display: block; margin-top: .35rem; color: var(--tabellone); font-size: .92rem; }

.momento { border-left: 3px solid var(--bordo); padding: .1rem 0 .1rem .8rem; margin: .55rem 0; }
.momento-alto { border-left-color: var(--campo); }
.momento-basso { border-left-color: var(--allarme); }

.riga { display: flex; justify-content: space-between; gap: 1rem; padding: .3rem 0; }
.griglia { display: grid; grid-template-columns: repeat(2, 1fr); gap: .6rem; }

@media (min-width: 40rem) {
  .griglia { grid-template-columns: repeat(4, 1fr); }
}
```

- [ ] **Step 8: Il guscio e la pagina d'ingresso**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'LEGGENDA — simulatore di carriera calcistica',
  description:
    'Crea un calciatore e vivi la sua carriera dal primo contratto al ritiro: squadre vere, decisioni che pesano, un rivale che ti insegue per vent\'anni.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>LEGGENDA</h1>
      <p className="tenue">
        Crea un calciatore e accompagnalo dal primo contratto al ritiro. Squadre vere,
        decisioni con la posta dichiarata, e un rivale della tua generazione che non ti
        molla per vent&apos;anni.
      </p>
      <Link href="/gioca" className="bottone bottone-forte" style={{ marginTop: '1rem' }}>
        Comincia una carriera
      </Link>
    </main>
  );
}
```

- [ ] **Step 9: Verificare che il sito si costruisca**

Run: `npm run build`
Expected: build completata, cartella `out/` creata con `index.html`.

Poi copiare i dati del mondo dentro il pacchetto pubblicato:

Run: `npm run import:world && npm run build && ls out/world/leagues | head -3`
Expected: i bundle dei campionati sono dentro `out/`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts src/app src/world/fetchSource.ts tests/world/fetchSource.test.ts
git commit -m "chore: impalcatura Next in export statico e mondo via fetch"
```

---

### Task 6: La schermata di creazione

**Files:**
- Create: `src/app/gioca/page.tsx`, `src/ui/useWorld.ts`, `src/ui/Creazione.tsx`
- Test: `tests/ui/creazione.test.ts` (logica, non rendering)

**Interfaces:**
- Produces:
  - `useWorld(): { clubs: CandidateClub[]; leagues: LeagueSummary[]; loading: boolean; error: string | null; loadCountry(country: string): Promise<void> }`
  - `Creazione` — componente che raccoglie nome, ruolo, nazione, campionato, club e restituisce un `CareerSave`
  - `newSave(input): CareerSave`

- [ ] **Step 1: Scrivere il test della logica di creazione**

`tests/ui/creazione.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { newSave, randomSeed } from '../../src/ui/newSave.js';

describe('newSave', () => {
  it('crea un salvataggio vuoto e coerente', () => {
    const save = newSave({
      name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17,
      leagueLevel: 1, startClubId: 'c1', seed: 99,
    });
    expect(save.seed).toBe(99);
    expect(save.startClubId).toBe('c1');
    expect(save.create.name).toBe('Diego');
    expect(save.decisions.training).toEqual({});
    expect(save.decisions.dilemmas).toEqual({});
    expect(save.decisions.transfers).toEqual({});
  });

  it('rifiuta un nome vuoto', () => {
    expect(() =>
      newSave({ name: '  ', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1, startClubId: 'c1', seed: 1 }),
    ).toThrow('nome');
  });

  it('rifiuta un\'età fuori dai limiti', () => {
    for (const age of [15, 20]) {
      expect(() =>
        newSave({ name: 'Diego', nationality: 'Italy', role: 'FWD', age, leagueLevel: 1, startClubId: 'c1', seed: 1 }),
      ).toThrow('età');
    }
  });

  it('taglia gli spazi attorno al nome', () => {
    const save = newSave({
      name: '  Diego  ', nationality: 'Italy', role: 'FWD', age: 17,
      leagueLevel: 1, startClubId: 'c1', seed: 1,
    });
    expect(save.create.name).toBe('Diego');
  });
});

describe('randomSeed', () => {
  it('produce interi positivi', () => {
    for (let i = 0; i < 50; i += 1) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Eseguire e verificare che fallisca**

Run: `npx vitest run tests/ui/creazione.test.ts`
Expected: FAIL — modulo `newSave.js` non trovato.

- [ ] **Step 3: Implementare `src/ui/newSave.ts`**

```ts
import type { CareerSave } from '../engine/play.js';
import { SAVE_VERSION } from '../engine/save.js';
import type { Role } from '../world/types.js';

export interface NewSaveInput {
  name: string;
  nationality: string;
  role: Role;
  age: number;
  leagueLevel: number;
  startClubId: string;
  seed: number;
}

const MIN_AGE = 16;
const MAX_AGE = 19;

export function newSave(input: NewSaveInput): CareerSave {
  const name = input.name.trim();
  if (name.length === 0) throw new Error('serve un nome per il tuo calciatore');
  if (input.age < MIN_AGE || input.age > MAX_AGE) {
    throw new Error(`età fuori dai limiti: si comincia fra i ${MIN_AGE} e i ${MAX_AGE} anni`);
  }

  return {
    version: SAVE_VERSION,
    seed: input.seed,
    create: {
      name,
      nationality: input.nationality,
      role: input.role,
      age: input.age,
      leagueLevel: input.leagueLevel,
    },
    startClubId: input.startClubId,
    decisions: { training: {}, dilemmas: {}, transfers: {} },
  };
}

/** Il seed di una carriera nuova. Qui la casualità è lecita: siamo fuori dal motore. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}
```

- [ ] **Step 4: Scrivere il caricatore del mondo**

`src/ui/useWorld.ts`:

```ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CandidateClub } from '../engine/market.js';
import { createFetchWorldSource } from '../world/fetchSource.js';
import type { LeagueSummary } from '../world/types.js';

/**
 * Carica l'indice dei campionati all'avvio e i singoli campionati su richiesta.
 * Il gioco parte con una manciata di kilobyte: i club arrivano quando l'utente
 * sceglie la nazione.
 */
export function useWorld() {
  const source = useMemo(() => createFetchWorldSource('/world'), []);
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [clubs, setClubs] = useState<CandidateClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    source
      .listLeagues()
      .then(setLeagues)
      .catch(() => setError('Non riesco a caricare i campionati. Ricarica la pagina.'))
      .finally(() => setLoading(false));
  }, [source]);

  const loadLeagues = useCallback(
    async (ids: readonly string[]): Promise<void> => {
      setLoading(true);
      try {
        const bundles = await Promise.all(ids.map((id) => source.loadLeague(id)));
        const loaded: CandidateClub[] = [];
        for (const bundle of bundles) {
          for (const club of bundle.clubs) {
            loaded.push({
              club,
              leagueId: bundle.league.id,
              leagueName: bundle.league.name,
              leagueLevel: bundle.league.level,
            });
          }
        }
        setClubs((previous) => {
          const known = new Set(previous.map((entry) => entry.club.id));
          return [...previous, ...loaded.filter((entry) => !known.has(entry.club.id))];
        });
      } catch {
        setError('Non riesco a caricare questo campionato.');
      } finally {
        setLoading(false);
      }
    },
    [source],
  );

  const countries = useMemo(
    () => [...new Set(leagues.map((league) => league.country))].sort((a, b) => a.localeCompare(b)),
    [leagues],
  );

  return { leagues, countries, clubs, loading, error, loadLeagues };
}
```

- [ ] **Step 5: Il componente di creazione**

`src/ui/Creazione.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { CareerSave } from '../engine/play.js';
import type { Role } from '../world/types.js';
import { newSave, randomSeed } from './newSave.js';
import { useWorld } from './useWorld.js';

const RUOLI: readonly { id: Role; label: string; nota: string }[] = [
  { id: 'GK', label: 'Portiere', nota: 'Ti giudicano sulle parate e sui clean sheet' },
  { id: 'DEF', label: 'Difensore', nota: 'Contano la porta inviolata e la continuità' },
  { id: 'MID', label: 'Centrocampista', nota: 'Assist, gol e il gioco che passa da te' },
  { id: 'FWD', label: 'Attaccante', nota: 'Ti pesano i gol, sempre' },
];

export function Creazione({ onStart }: { onStart: (save: CareerSave) => void }) {
  const world = useWorld();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('FWD');
  const [age, setAge] = useState(17);
  const [country, setCountry] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [clubId, setClubId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const leaguesOfCountry = world.leagues.filter((league) => league.country === country);
  const clubsOfLeague = world.clubs.filter((entry) => entry.leagueId === leagueId);
  const chosenLeague = world.leagues.find((league) => league.id === leagueId);

  return (
    <>
      <h1>Il tuo calciatore</h1>

      <div className="card">
        <label htmlFor="nome">Come si chiama</label>
        <input
          id="nome"
          className="bottone"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome e cognome"
        />
      </div>

      <div className="card">
        <p>In che ruolo gioca</p>
        <div className="griglia">
          {RUOLI.map((item) => (
            <button
              key={item.id}
              type="button"
              className="bottone"
              style={role === item.id ? { borderColor: 'var(--campo)' } : undefined}
              onClick={() => setRole(item.id)}
            >
              {item.label}
              <span className="posta">{item.nota}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p>Quanti anni ha</p>
        <div className="griglia">
          {[16, 17, 18, 19].map((value) => (
            <button
              key={value}
              type="button"
              className="bottone"
              style={age === value ? { borderColor: 'var(--campo)' } : undefined}
              onClick={() => setAge(value)}
            >
              {value} anni
              <span className="posta">
                {value === 16 ? 'Più tempo per crescere, meno pronto' : value === 19 ? 'Già formato, meno margine' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p>Dove comincia</p>
        <select
          className="bottone"
          value={country}
          onChange={(event) => {
            setCountry(event.target.value);
            setLeagueId('');
            setClubId('');
          }}
        >
          <option value="">Scegli la nazione</option>
          {world.countries.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        {country !== '' && (
          <select
            className="bottone"
            style={{ marginTop: '.6rem' }}
            value={leagueId}
            onChange={(event) => {
              setLeagueId(event.target.value);
              setClubId('');
              if (event.target.value !== '') void world.loadLeagues([event.target.value]);
            }}
          >
            <option value="">Scegli il campionato</option>
            {leaguesOfCountry.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name} — {league.level}ª divisione
              </option>
            ))}
          </select>
        )}

        {leagueId !== '' && clubsOfLeague.length > 0 && (
          <select
            className="bottone"
            style={{ marginTop: '.6rem' }}
            value={clubId}
            onChange={(event) => setClubId(event.target.value)}
          >
            <option value="">Scegli il club</option>
            {[...clubsOfLeague]
              .sort((a, b) => a.club.name.localeCompare(b.club.name))
              .map((entry) => (
                <option key={entry.club.id} value={entry.club.id}>{entry.club.name}</option>
              ))}
          </select>
        )}

        {chosenLeague && chosenLeague.level > 1 && (
          <p className="posta">
            Partire dalla {chosenLeague.level}ª divisione è più duro, ma nel punteggio
            finale vale di più.
          </p>
        )}
      </div>

      {error !== null && <p style={{ color: 'var(--allarme)' }}>{error}</p>}
      {world.error !== null && <p style={{ color: 'var(--allarme)' }}>{world.error}</p>}

      <button
        type="button"
        className="bottone bottone-forte"
        disabled={clubId === '' || world.loading}
        onClick={() => {
          try {
            const league = world.leagues.find((item) => item.id === leagueId);
            onStart(
              newSave({
                name,
                nationality: country || 'Italy',
                role,
                age,
                leagueLevel: league?.level ?? 1,
                startClubId: clubId,
                seed: randomSeed(),
              }),
            );
          } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'Qualcosa non va');
          }
        }}
      >
        Firma il primo contratto
      </button>
    </>
  );
}
```

- [ ] **Step 6: Eseguire i test e il sito**

Run: `npx vitest run tests/ui/ && npm run build`
Expected: verde.

- [ ] **Step 7: Commit**

```bash
git add src/ui src/app tests/ui
git commit -m "feat: schermata di creazione del calciatore"
```

---

### Task 7: La carriera: preparazione, stagione, bivi, mercato

Il cuore dell'interfaccia. Una schermata sola che mostra quello che serve **adesso**, guidata da `playCareer`.

**Files:**
- Create: `src/ui/Carriera.tsx`, `src/ui/Stagione.tsx`, `src/ui/Bivio.tsx`, `src/ui/Mercato.tsx`, `src/ui/Preparazione.tsx`
- Modify: `src/app/gioca/page.tsx`

**Interfaces:**
- Consumes: `playCareer`, `seasonMoments`, `TRAINING_AXES`, `CareerSave`
- Produces: `Carriera({ save, clubs, onChange })` — riceve il salvataggio e restituisce quello aggiornato a ogni decisione

- [ ] **Step 1: La preparazione**

`src/ui/Preparazione.tsx`:

```tsx
'use client';

import { TRAINING_AXES, type TrainingAxis } from '../engine/training.js';

export function Preparazione({
  season,
  onChoose,
}: {
  season: number;
  onChoose: (axis: TrainingAxis) => void;
}) {
  return (
    <div className="card">
      <h2>Preparazione — stagione {season}</h2>
      <p className="tenue">Su cosa lavori quest&apos;anno. Una scelta sola, e conta per sempre.</p>
      <div className="griglia">
        {TRAINING_AXES.map((axis) => (
          <button key={axis.id} type="button" className="bottone" onClick={() => onChoose(axis.id)}>
            <strong>{axis.label}</strong>
            <span className="posta">{axis.promise}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Il bivio, con la posta in chiaro**

`src/ui/Bivio.tsx`:

```tsx
'use client';

import type { Dilemma } from '../engine/types.js';

/**
 * La schermata che ci distingue dal concorrente: ogni strada dichiara cosa mette
 * in gioco, e le probabilità mostrate sono le stesse che il motore usa davvero (spec §3.5).
 */
export function Bivio({
  dilemma,
  onChoose,
}: {
  dilemma: Dilemma;
  onChoose: (optionId: string) => void;
}) {
  return (
    <div className="card" style={{ borderColor: 'var(--tabellone)' }}>
      <h2>{dilemma.title}</h2>
      <p>{dilemma.text}</p>
      {dilemma.options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="bottone"
          style={{ marginTop: '.6rem' }}
          onClick={() => onChoose(option.id)}
        >
          <strong>{option.label}</strong>
          <span className="posta">{option.stake}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Il mercato, coi minuti attesi**

`src/ui/Mercato.tsx`:

```tsx
'use client';

import type { Offer } from '../engine/types.js';

function milioni(valore: number): string {
  return valore >= 1_000_000
    ? `${(valore / 1_000_000).toFixed(1)}M`
    : `${Math.round(valore / 1000)}K`;
}

export function Mercato({
  offers,
  onChoose,
}: {
  offers: readonly Offer[];
  onChoose: (clubId: string) => void;
}) {
  return (
    <div className="card">
      <h2>Mercato</h2>
      {offers.length === 0 ? (
        <p className="tenue">Nessuna offerta quest&apos;anno. Si continua da dove eravamo.</p>
      ) : (
        <p className="tenue">
          Quanto giocheresti è una stima della società, non una promessa. Ma è la stessa
          che usa il gioco per calcolare la tua stagione.
        </p>
      )}

      {offers.map((offer) => (
        <button
          key={offer.clubId}
          type="button"
          className="bottone"
          style={{ marginTop: '.6rem' }}
          onClick={() => onChoose(offer.clubId)}
        >
          <strong>{offer.clubName}</strong> — {offer.leagueName}
          {offer.isLoan && ' (prestito)'}
          <span className="posta">
            Giocheresti circa il {Math.round(offer.expectedMinutesShare * 100)}% dei minuti
            {!offer.isLoan && ` · cartellino ${milioni(offer.feeEur)}`}
            {` · ingaggio ${milioni(offer.weeklyWageEur * 52)} l'anno`}
          </span>
        </button>
      ))}

      <button
        type="button"
        className="bottone bottone-forte"
        style={{ marginTop: '.9rem' }}
        onClick={() => onChoose('resta')}
      >
        Resta dove sei
      </button>
    </div>
  );
}
```

- [ ] **Step 4: La stagione raccontata**

`src/ui/Stagione.tsx`:

```tsx
'use client';

import { seasonMoments } from '../engine/moments.js';
import type { SeasonRecord } from '../engine/types.js';

export function Stagione({
  record,
  previous,
  isFirst,
  playerName,
}: {
  record: SeasonRecord;
  previous: SeasonRecord | undefined;
  isFirst: boolean;
  playerName: string;
}) {
  const moments = seasonMoments({ record, previous, isFirstSeason: isFirst, playerName });
  const crescita = record.overallEnd - record.overallStart;

  return (
    <div className="card">
      <div className="riga">
        <strong>{record.clubName}</strong>
        <span className="tenue numero">{record.age} anni</span>
      </div>
      <div className="riga tenue">
        <span>{record.leagueName} — {record.position}° posto</span>
        <span className="numero">
          OVR {record.overallEnd} {crescita !== 0 && `(${crescita > 0 ? '+' : ''}${crescita})`}
        </span>
      </div>

      {moments.map((moment) => (
        <p key={moment.id} className={`momento momento-${moment.tone}`}>
          {moment.text}
        </p>
      ))}

      <div className="riga numero" style={{ borderTop: '1px solid var(--bordo)', marginTop: '.7rem', paddingTop: '.7rem' }}>
        <span>{record.stats.appearances} presenze</span>
        <span>{record.stats.goals} gol</span>
        <span>{record.stats.assists} assist</span>
        <span>voto {record.stats.rating.toFixed(1)}</span>
      </div>

      {record.choices.map((choice) => (
        <p key={`${choice.dilemmaId}-${choice.optionId}`} className="posta">
          {choice.optionLabel}: {choice.outcomeText}
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Il contenitore**

`Carriera.tsx` importa il componente `Verdetto`, che nasce nel **Task 8**: eseguire quel
task prima di questo passo, altrimenti la build si ferma su un import mancante.


`src/ui/Carriera.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import type { CandidateClub } from '../engine/market.js';
import { decisionKey, playCareer, type CareerSave } from '../engine/play.js';
import { Bivio } from './Bivio.js';
import { Mercato } from './Mercato.js';
import { Preparazione } from './Preparazione.js';
import { Stagione } from './Stagione.js';
import { Verdetto } from './Verdetto.js';

export function Carriera({
  save,
  clubs,
  onChange,
}: {
  save: CareerSave;
  clubs: readonly CandidateClub[];
  onChange: (save: CareerSave) => void;
}) {
  // Nessuno stato di gioco qui dentro: la schermata è una funzione del salvataggio.
  const state = useMemo(() => playCareer(save, clubs), [save, clubs]);

  const decide = (patch: Partial<CareerSave['decisions']>): void => {
    onChange({ ...save, decisions: { ...save.decisions, ...patch } });
  };

  const pending = state.pending;

  return (
    <>
      <h1>{save.create.name}</h1>

      {pending?.kind === 'training' && (
        <Preparazione
          season={pending.season}
          onChoose={(axis) =>
            decide({ training: { ...save.decisions.training, [String(pending.season)]: axis } })
          }
        />
      )}

      {pending?.kind === 'dilemma' && (
        <Bivio
          dilemma={pending.dilemma}
          onChoose={(optionId) =>
            decide({
              dilemmas: {
                ...save.decisions.dilemmas,
                [decisionKey(pending.season, pending.dilemma.id)]: optionId,
              },
            })
          }
        />
      )}

      {pending?.kind === 'transfer' && (
        <Mercato
          offers={pending.offers}
          onChoose={(clubId) =>
            decide({ transfers: { ...save.decisions.transfers, [String(pending.season)]: clubId } })
          }
        />
      )}

      {state.finished && state.result !== null && <Verdetto result={state.result} />}

      <h2 style={{ marginTop: '1.5rem' }}>La carriera fin qui</h2>
      {[...state.seasons].reverse().map((record, index, list) => (
        <Stagione
          key={record.season}
          record={record}
          previous={list[index + 1]}
          isFirst={record.season === 1}
          playerName={save.create.name}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 6: Caricare abbastanza mondo perché il mercato esista**

Attenzione a un difetto facile: `Creazione` carica **solo** il campionato scelto, e se la
carriera partisse con quei soli club il mercato non avrebbe quasi offerte. Appena la
carriera comincia vanno caricati anche gli altri campionati principali, in sottofondo.

In `src/app/gioca/page.tsx`, dopo che il salvataggio esiste:

```tsx
  useEffect(() => {
    if (save === null) return;
    // Il mercato ha senso solo se il mondo è abbastanza grande: carichiamo le prime
    // dodici leghe dell'indice, una volta sola, mentre l'utente legge la prima stagione.
    void world.loadLeagues(world.leagues.slice(0, 12).map((league) => league.id));
  }, [save === null, world.leagues.length]);
```

Il gioco resta leggero: i campionati arrivano dopo il primo click, non al primo caricamento.

- [ ] **Step 7: La pagina di gioco**

`src/app/gioca/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Carriera } from '../../ui/Carriera.js';
import { Creazione } from '../../ui/Creazione.js';
import { useWorld } from '../../ui/useWorld.js';
import type { CareerSave } from '../../engine/play.js';

export default function Gioca() {
  const world = useWorld();
  const [save, setSave] = useState<CareerSave | null>(null);

  return (
    <main>
      {save === null ? (
        <Creazione onStart={setSave} />
      ) : (
        <Carriera save={save} clubs={world.clubs} onChange={setSave} />
      )}
    </main>
  );
}
```

- [ ] **Step 8: Provare davvero**

Run: `npm run dev`, aprire `http://localhost:3000/gioca`, creare un calciatore e giocare cinque stagioni.

Da verificare a mano, con gli occhi:
- la posta di ogni bivio si legge prima di scegliere;
- ogni offerta di mercato dichiara i minuti attesi;
- la timeline racconta la stagione senza sembrare una tabella;
- su schermo stretto (finestra a 375 px) non c'è scorrimento orizzontale.

- [ ] **Step 9: Commit**

```bash
git add src/ui src/app
git commit -m "feat: schermata di carriera con preparazione, stagione, bivi e mercato"
```

---

### Task 8: Il verdetto finale

**Files:**
- Create: `src/ui/Verdetto.tsx`

**Interfaces:**
- Consumes: `CareerResult`

- [ ] **Step 1: Implementare**

`src/ui/Verdetto.tsx`:

```tsx
'use client';

import type { CareerResult, GoatComponent } from '../engine/types.js';

const ETICHETTE: Record<GoatComponent, string> = {
  performance: 'Rendimento',
  trophies: 'Trofei',
  awards: 'Premi individuali',
  national: 'Nazionale',
  peakOverall: 'Picco',
  peakValue: 'Valore massimo',
  longevity: 'Longevità',
  rival: 'Confronto col rivale',
  difficulty: 'Difficoltà del percorso',
};

export function Verdetto({ result }: { result: CareerResult }) {
  const gol = result.seasons.reduce((sum, season) => sum + season.stats.goals, 0);
  const presenze = result.seasons.reduce((sum, season) => sum + season.stats.appearances, 0);
  const davanti = result.seasonsAheadOfRival > result.seasons.length / 2;

  return (
    <div className="card" style={{ borderColor: 'var(--tabellone)' }}>
      <h2>Ritirato a {result.retiredAt} anni</h2>
      <p style={{ fontSize: '2.6rem', fontWeight: 700, margin: '.2rem 0' }} className="numero">
        {result.goat.total}
        <span className="tenue" style={{ fontSize: '1rem', fontWeight: 400 }}> / 1000</span>
      </p>

      <div className="riga numero">
        <span>{presenze} presenze</span>
        <span>{gol} gol</span>
        <span>{result.trophies.length} trofei</span>
        <span>{result.totalCaps} in nazionale</span>
      </div>

      <p style={{ marginTop: '.8rem' }}>
        {davanti
          ? `Hai chiuso davanti a ${result.rival.name}.`
          : `${result.rival.name} ti è rimasto davanti.`}{' '}
        <span className="tenue">
          Lui: picco {result.rival.peakOverall}, {result.rival.goals} gol,{' '}
          {result.rival.trophies} trofei.
        </span>
      </p>

      <p className="tenue">Squadre: {result.clubsPlayed.join(' → ')}</p>

      {result.marks.length > 0 && (
        <p className="posta">
          Quello che si sono ricordati di te: {result.marks.map((mark) => mark.id.replace(/-/g, ' ')).join(', ')}
        </p>
      )}

      <div style={{ marginTop: '1rem' }}>
        {(Object.keys(ETICHETTE) as GoatComponent[]).map((key) => (
          <div key={key} className="riga">
            <span className="tenue">{ETICHETTE[key]}</span>
            <span className="numero">{Math.round(result.goat.components[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Provare una carriera fino in fondo**

Run: `npm run dev`, giocare una carriera intera fino al ritiro.
Expected: il verdetto compare col punteggio, il confronto col rivale e le nove voci.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Verdetto.tsx
git commit -m "feat: verdetto finale con punteggio GOAT e confronto col rivale"
```

---

### Task 9: I salvataggi

**Files:**
- Create: `src/ui/storage.ts`, `src/ui/Salvataggi.tsx`
- Modify: `src/app/gioca/page.tsx`
- Test: `tests/ui/storage.test.ts`

**Interfaces:**
- Produces:
  - `SlotSummary` = `{ id: string; name: string; seasons: number; updatedAt: number }`
  - `listSlots(storage: Storage): SlotSummary[]`
  - `saveSlot(storage: Storage, id: string, save: CareerSave, seasons: number, now: number): void`
  - `loadSlot(storage: Storage, id: string): CareerSave | null`
  - `deleteSlot(storage: Storage, id: string): void`

Slot illimitati, non tre come il concorrente: un salvataggio pesa poche centinaia di byte.

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/ui/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteSlot, listSlots, loadSlot, saveSlot } from '../../src/ui/storage.js';
import { SAVE_VERSION } from '../../src/engine/save.js';
import type { CareerSave } from '../../src/engine/play.js';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

const save: CareerSave = {
  version: SAVE_VERSION, seed: 1,
  create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
  startClubId: 'c1',
  decisions: { training: {}, dilemmas: {}, transfers: {} },
};

describe('i salvataggi nel browser', () => {
  let storage: Storage;
  beforeEach(() => { storage = new MemoryStorage(); });

  it('all\'inizio non ce n\'è nessuno', () => {
    expect(listSlots(storage)).toEqual([]);
  });

  it('salva e rilegge', () => {
    saveSlot(storage, 'slot-1', save, 3, 1000);
    expect(loadSlot(storage, 'slot-1')).toEqual(save);
  });

  it('elenca i salvataggi dal più recente', () => {
    saveSlot(storage, 'a', save, 2, 1000);
    saveSlot(storage, 'b', { ...save, seed: 2 }, 9, 2000);
    const slots = listSlots(storage);
    expect(slots.map((slot) => slot.id)).toEqual(['b', 'a']);
    expect(slots[0]?.seasons).toBe(9);
    expect(slots[0]?.name).toBe('Diego');
  });

  it('sovrascrive lo stesso slot senza duplicarlo', () => {
    saveSlot(storage, 'a', save, 2, 1000);
    saveSlot(storage, 'a', save, 5, 2000);
    expect(listSlots(storage)).toHaveLength(1);
    expect(listSlots(storage)[0]?.seasons).toBe(5);
  });

  it('cancella', () => {
    saveSlot(storage, 'a', save, 2, 1000);
    deleteSlot(storage, 'a');
    expect(listSlots(storage)).toEqual([]);
    expect(loadSlot(storage, 'a')).toBeNull();
  });

  it('uno slot corrotto non fa crollare l\'elenco', () => {
    saveSlot(storage, 'a', save, 2, 1000);
    storage.setItem('leggenda:save:rotto', 'non-json');
    expect(() => listSlots(storage)).not.toThrow();
    expect(listSlots(storage)).toHaveLength(1);
  });

  it('un salvataggio di versione vecchia viene ignorato', () => {
    storage.setItem(
      'leggenda:save:antico',
      JSON.stringify({ save: { ...save, version: 0 }, seasons: 4, updatedAt: 1 }),
    );
    expect(listSlots(storage)).toHaveLength(0);
    expect(loadSlot(storage, 'antico')).toBeNull();
  });
});
```

- [ ] **Step 2: Eseguire e verificare che fallisca**

Run: `npx vitest run tests/ui/storage.test.ts`
Expected: FAIL — modulo `storage.js` non trovato.

- [ ] **Step 3: Implementare `src/ui/storage.ts`**

```ts
import type { CareerSave } from '../engine/play.js';
import { isSupportedSave } from '../engine/save.js';

const PREFIX = 'leggenda:save:';

export interface SlotSummary {
  id: string;
  name: string;
  seasons: number;
  updatedAt: number;
}

interface StoredSlot {
  save: CareerSave;
  seasons: number;
  updatedAt: number;
}

function readSlot(storage: Storage, key: string): StoredSlot | null {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSlot>;
    if (!isSupportedSave(parsed.save)) return null;
    return {
      save: parsed.save,
      seasons: typeof parsed.seasons === 'number' ? parsed.seasons : 0,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    // Uno slot illeggibile non deve impedire di vedere gli altri.
    return null;
  }
}

export function listSlots(storage: Storage): SlotSummary[] {
  const slots: SlotSummary[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key === null || !key.startsWith(PREFIX)) continue;
    const stored = readSlot(storage, key);
    if (!stored) continue;
    slots.push({
      id: key.slice(PREFIX.length),
      name: stored.save.create.name,
      seasons: stored.seasons,
      updatedAt: stored.updatedAt,
    });
  }
  return slots.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveSlot(
  storage: Storage,
  id: string,
  save: CareerSave,
  seasons: number,
  now: number,
): void {
  const stored: StoredSlot = { save, seasons, updatedAt: now };
  storage.setItem(PREFIX + id, JSON.stringify(stored));
}

export function loadSlot(storage: Storage, id: string): CareerSave | null {
  return readSlot(storage, PREFIX + id)?.save ?? null;
}

export function deleteSlot(storage: Storage, id: string): void {
  storage.removeItem(PREFIX + id);
}
```

- [ ] **Step 4: Collegare i salvataggi alla pagina**

In `src/app/gioca/page.tsx`: salvare automaticamente a ogni decisione (`useEffect` su `save`), offrire l'elenco degli slot all'avvio, e una casella per incollare un codice condiviso (`decodeSave`). Il salvataggio automatico usa un id creato alla prima partita e tenuto in stato.

```tsx
  useEffect(() => {
    if (save === null || slotId === null) return;
    try {
      saveSlot(window.localStorage, slotId, save, playCareer(save, world.clubs).seasons.length, Date.now());
    } catch {
      // Spazio esaurito o modalità privata: il gioco continua, semplicemente non si salva.
    }
  }, [save, slotId, world.clubs]);
```

- [ ] **Step 5: Verificare a mano**

Run: `npm run dev` — giocare tre stagioni, ricaricare la pagina, riprendere la carriera dall'elenco. Copiare il codice, aprire una finestra anonima, incollarlo: deve ricomparire la stessa identica carriera.

- [ ] **Step 6: Commit**

```bash
git add src/ui tests/ui src/app
git commit -m "feat: salvataggi illimitati nel browser e codice condivisibile"
```

---

### Task 10: Il golden path end-to-end

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/golden-path.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Installare Playwright**

```bash
npm install -D @playwright/test@latest
npx playwright install chromium
```

- [ ] **Step 2: Configurare**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'telefono', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

Aggiungere a `package.json`: `"test:e2e": "playwright test"`.

- [ ] **Step 3: Scrivere il test**

`tests/e2e/golden-path.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('si crea un calciatore e si gioca una carriera', async ({ page }) => {
  await page.goto('/gioca');

  await page.getByLabel('Come si chiama').fill('Diego Trovato');
  await page.getByRole('button', { name: /Attaccante/ }).click();

  await page.getByRole('combobox').first().selectOption('Italy');
  await page.getByRole('combobox').nth(1).selectOption({ label: /Serie A/ });
  await page.getByRole('combobox').nth(2).selectOption({ index: 1 });

  await page.getByRole('button', { name: 'Firma il primo contratto' }).click();

  // Prima decisione: la preparazione.
  await expect(page.getByRole('heading', { name: /Preparazione/ })).toBeVisible();
  await page.getByRole('button', { name: /Tecnica/ }).click();

  // Da qui in avanti si prende sempre la prima strada disponibile, finché la
  // carriera non finisce o non si arriva a venti decisioni.
  for (let step = 0; step < 40; step += 1) {
    if (await page.getByText(/^Ritirato a /).isVisible().catch(() => false)) break;
    const button = page.locator('button.bottone').first();
    if (!(await button.isVisible().catch(() => false))) break;
    await button.click();
  }

  // Qualunque strada si sia presa, deve esserci una carriera da leggere.
  await expect(page.getByText(/presenze/).first()).toBeVisible();
});

test('la posta in gioco è sempre visibile su un bivio', async ({ page }) => {
  await page.goto('/gioca');
  await page.getByLabel('Come si chiama').fill('Test');
  await page.getByRole('combobox').first().selectOption('Italy');
  await page.getByRole('combobox').nth(1).selectOption({ index: 1 });
  await page.getByRole('combobox').nth(2).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Firma il primo contratto' }).click();

  // Ogni scelta offerta dal gioco dichiara cosa mette in gioco.
  const poste = page.locator('.posta');
  await expect(poste.first()).toBeVisible();
});

test('su telefono non si scorre in orizzontale', async ({ page }) => {
  await page.goto('/gioca');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
```

- [ ] **Step 4: Eseguire**

Run: `npm run test:e2e`
Expected: verde su entrambi i progetti (desktop e telefono).

Se il test del golden path fallisce perché un selettore non trova nulla, **non allentare il test**: sistemare l'interfaccia perché i controlli siano raggiungibili (etichette collegate, ruoli corretti). Un'interfaccia che Playwright non sa usare è un'interfaccia che uno screen reader non sa leggere.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e package.json package-lock.json
git commit -m "test: golden path end-to-end su desktop e telefono"
```

---

### Task 11: Peso e velocità

Il concorrente spedisce 3,2 MB in un file solo. Questa è la verifica che manteniamo il vantaggio.

**Files:**
- Create: `scripts/check-bundle.ts`
- Modify: `package.json`

- [ ] **Step 1: Scrivere il controllo**

`scripts/check-bundle.ts`:

```ts
/**
 * Verifica che il gioco resti leggero. Il concorrente carica 3,2 MB di JavaScript
 * in un file solo: il nostro primo caricamento deve restare sotto i 300 KB.
 * Uso: npm run check:bundle (dopo npm run build)
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT_KB = 300;

function totalKb(dir: string): number {
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      bytes += totalKb(path) * 1024;
    } else if (entry.name.endsWith('.js')) {
      bytes += statSync(path).size;
    }
  }
  return bytes / 1024;
}

const chunks = totalKb('out/_next/static');
console.log(`JavaScript totale: ${chunks.toFixed(0)} KB (limite ${LIMIT_KB} KB)`);

const world = totalKb('out/world');
console.log(`Dati del mondo: ${world.toFixed(0)} KB, scaricati un campionato per volta`);

if (chunks > LIMIT_KB) {
  console.error(`\nIl gioco è ingrassato: ${chunks.toFixed(0)} KB contro un limite di ${LIMIT_KB} KB.`);
  process.exit(1);
}
console.log('\nPeso sotto controllo.');
```

Aggiungere a `package.json`:

```json
    "check:bundle": "tsx scripts/check-bundle.ts",
```

e in coda a `verify`: `&& npm run check:bundle`.

- [ ] **Step 2: Eseguire**

Run: `npm run build && npm run check:bundle`
Expected: sotto i 300 KB. Se sfora, il colpevole più probabile è un import del motore dentro un componente server, o un campionato importato staticamente invece che via fetch.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-bundle.ts package.json
git commit -m "test: il gioco deve restare sotto i 300 KB di JavaScript"
```

---

### Task 12: Verifica finale e rilettura

- [ ] **Step 1: Verifica automatica completa**

```bash
npm run import:world
npm run verify
npm run test:e2e
```

- [ ] **Step 2: Rilettura a mano — la parte che i test non fanno**

Come dice D-012, prima di chiudere una fase bisogna **usarla**. Giocare una carriera intera nel browser, su finestra stretta, e verificare:

1. Si capisce sempre cosa sta succedendo e cosa si sta scegliendo?
2. La posta di ogni bivio è leggibile **prima** di decidere?
3. La timeline racconta una storia o è una tabella travestita?
4. Alla fine viene voglia di ricominciare?

Annotare quello che non va in `docs/decisions.md` come D-013, e correggere i difetti che rendono il gioco poco leggibile — non quelli estetici, che sono Fase 5.

- [ ] **Step 3: Commit**

```bash
git add docs/decisions.md
git commit -m "docs: rilettura della Fase 4 e difetti trovati giocando"
```

---

## Verifica finale della Fase 4

```bash
npm run verify        # lint dei tipi, test, build, lab, choices-lab, peso
npm run test:e2e      # golden path su desktop e telefono
```

Al termine LEGGENDA **si gioca**: si crea un calciatore, si vive la carriera stagione per stagione decidendo davvero, si arriva al verdetto, e la carriera si salva e si condivide con un codice.

## Cosa NON si costruisce in questa fase

Il poster condivisibile, le pagine guida per la ricerca Google, la PWA installabile, le traduzioni. Sono la Fase 5. Neppure la rifinitura estetica: qui l'interfaccia deve essere **chiara e leggera**, non bella. Il bello arriva quando il gioco è giusto.
