# LEGGENDA — Fase 3: il Rivale, i bivi con rischio, i Segni, il punteggio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire i due sistemi che il concorrente non ha — un Rivale generazionale simulato in parallelo per tutta la carriera, e decisioni con la posta dichiarata che lasciano Segni capaci di riemergere dieci stagioni dopo — più gli infortuni che li alimentano e il punteggio GOAT che chiude la carriera.

**Architecture:** Quattro moduli nuovi e indipendenti (`marks`, `injuries`, `dilemmas`, `rival`) più `goatScore`, cuciti insieme da `season.ts` e `career.ts`. I bivi seguono lo stesso schema del mercato: il motore *espone* le decisioni e *riceve* una scelta, con una policy automatica per il Simulation Lab che in Fase 4 verrà sostituita dall'utente. Il Rivale riusa `simulateSeason` con un proprio generatore casuale derivato, così non consuma la sequenza del giocatore e il determinismo resta intatto.

**Tech Stack:** Node 24, TypeScript 5.9, vitest 3.2, tsx 4.20. Nessuna nuova dipendenza.

**Spec:** `docs/specs/2026-08-28-leggenda-v1-design.md` (§3.3, §3.4, §3.5, §3.7, §6)
**Fasi precedenti:** `docs/plans/2026-08-28-leggenda-fase1-fondamenta.md`, `docs/plans/2026-08-28-leggenda-fase2-stagione-e-mercato.md` — completate
**Decisioni:** `docs/decisions.md` — leggere D-005, D-007 e D-008 prima di cominciare

## Global Constraints

- **Determinismo assoluto**: in `src/engine/` sono vietati `Math.random()`, `Date.now()`, `new Date()`. Il Rivale usa un RNG derivato dal seed della carriera, mai lo stesso oggetto `Rng` del giocatore.
- **Il motore non conosce la fonte dati**: `src/engine/` non importa mai da `src/world/fileSource.ts`.
- **Funzioni pure**: nessun modulo muta gli argomenti.
- **Test sui dati veri** (D-005): ogni sistema che dipende dalle rose ha anche un test su `public/world`.
- **I testi di gioco stanno nei cataloghi, non nel codice**: i bivi vivono in `src/engine/dilemmaCatalog.ts`, separati dalla logica che li seleziona e risolve. In Fase 5 quel file diventerà traducibile senza toccare il motore.
- **Il Lab è il guardiano**: `npm run lab` deve restare verde, comprese le invarianti di D-004 già attive.
- **Contratti**: questa fase introduce la durata del contratto, che in D-008 era stata rimandata proprio qui.
- **Un commit per task**, messaggio in italiano.

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `src/engine/types.ts` | **modificare** — `Mark`, `Injury`, `Dilemma`, `DilemmaChoice`, `Showdown`, `GoatScore`, `SeasonRecord` e `CareerResult` arricchiti |
| `src/engine/marks.ts` | **nuovo** — i Segni: applicazione, decadimento, effetti sul motore |
| `src/engine/injuries.ts` | **nuovo** — infortuni: probabilità, gravità, minuti persi, tracce permanenti |
| `src/engine/dilemmaCatalog.ts` | **nuovo** — il catalogo dei bivi, testi italiani inclusi |
| `src/engine/dilemmas.ts` | **nuovo** — selezione contestuale, risoluzione, policy automatica |
| `src/engine/rival.ts` | **nuovo** — creazione e avanzamento del Rivale, scontri diretti |
| `src/engine/goatScore.ts` | **nuovo** — il punteggio finale, normalizzato per ruolo |
| `src/engine/contract.ts` | **nuovo** — durata del contratto e scadenza (chiude D-008) |
| `src/engine/season.ts` | **modificare** — infortuni, bivi e Segni dentro la stagione |
| `src/engine/career.ts` | **modificare** — Rivale in parallelo, scelte, contratto, punteggio finale |
| `scripts/lab.ts` | **modificare** — nuove misure e invarianti |

---

### Task 1: I Segni

La memoria del gioco. Senza questo modulo i bivi sono eventi usa-e-getta come quelli del concorrente.

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/marks.ts`
- Test: `tests/engine/marks.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `MarkId` — unione di stringhe (elenco sotto)
  - `Mark` = `{ id: MarkId; intensity: number; seasonAcquired: number }`
  - `addMark(marks: readonly Mark[], id: MarkId, intensity: number, season: number): Mark[]`
  - `ageMarks(marks: readonly Mark[]): Mark[]`
  - `markIntensity(marks: readonly Mark[], id: MarkId): number`
  - `injuryRiskModifier(marks: readonly Mark[]): number`
  - `minutesModifier(marks: readonly Mark[]): number`
  - `interestModifier(marks: readonly Mark[]): number`

Catalogo dei Segni e loro effetti:

| Segno | Effetto | Permanente |
|---|---|---|
| `ginocchio-fragile` | +60% rischio infortunio | sì |
| `uomo-spogliatoio` | +6% minuti | no |
| `rissa-col-mister` | −18% minuti | no |
| `mercenario` | −20% interesse dei club | no |
| `bandiera` | +15% interesse, ma solo dal proprio club | no |
| `beniamino-dei-tifosi` | +4% minuti | no |
| `promessa-tradita` | −12% interesse dei club | no |
| `tornato-a-casa` | nessun effetto meccanico, conta nel poster | no |
| `carattere-fragile` | −8% minuti | no |
| `leader-riconosciuto` | +8% minuti, +10% interesse | no |

I Segni non permanenti perdono l'8% di intensità a stagione e spariscono sotto 0,15.

- [ ] **Step 1: Aggiungere i tipi**

In `src/engine/types.ts`:

```ts
/** I Segni sono la memoria della carriera: una scelta fatta a vent'anni pesa ancora a trenta. */
export type MarkId =
  | 'ginocchio-fragile'
  | 'uomo-spogliatoio'
  | 'rissa-col-mister'
  | 'mercenario'
  | 'bandiera'
  | 'beniamino-dei-tifosi'
  | 'promessa-tradita'
  | 'tornato-a-casa'
  | 'carattere-fragile'
  | 'leader-riconosciuto';

export interface Mark {
  id: MarkId;
  /** Da 0 a 1: quanto pesa adesso. Cala col tempo, tranne per i segni permanenti. */
  intensity: number;
  seasonAcquired: number;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/marks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addMark, ageMarks, injuryRiskModifier, interestModifier, markIntensity, minutesModifier,
} from '../../src/engine/marks.js';
import type { Mark } from '../../src/engine/types.js';

describe('addMark', () => {
  it('aggiunge un segno nuovo', () => {
    const marks = addMark([], 'mercenario', 0.6, 4);
    expect(marks).toHaveLength(1);
    expect(marks[0]).toEqual({ id: 'mercenario', intensity: 0.6, seasonAcquired: 4 });
  });

  it('rinforza un segno che si ha già, senza duplicarlo', () => {
    const once = addMark([], 'mercenario', 0.5, 2);
    const twice = addMark(once, 'mercenario', 0.4, 6);
    expect(twice).toHaveLength(1);
    expect(twice[0]!.intensity).toBeGreaterThan(0.5);
    expect(twice[0]!.intensity).toBeLessThanOrEqual(1);
  });

  it('non muta la lista che riceve', () => {
    const before: Mark[] = [];
    addMark(before, 'bandiera', 0.5, 1);
    expect(before).toHaveLength(0);
  });

  it("l'intensità non supera mai 1", () => {
    let marks = addMark([], 'bandiera', 0.9, 1);
    for (let i = 0; i < 5; i += 1) marks = addMark(marks, 'bandiera', 0.9, i);
    expect(marks[0]!.intensity).toBeLessThanOrEqual(1);
  });
});

describe('ageMarks', () => {
  it('i segni sbiadiscono col tempo', () => {
    const marks = ageMarks(addMark([], 'rissa-col-mister', 0.8, 1));
    expect(marks[0]!.intensity).toBeLessThan(0.8);
  });

  it('un segno quasi spento sparisce', () => {
    let marks = addMark([], 'rissa-col-mister', 0.2, 1);
    for (let i = 0; i < 10; i += 1) marks = ageMarks(marks);
    expect(marks.find((mark) => mark.id === 'rissa-col-mister')).toBeUndefined();
  });

  it('il ginocchio fragile non guarisce mai', () => {
    let marks = addMark([], 'ginocchio-fragile', 0.7, 1);
    for (let i = 0; i < 20; i += 1) marks = ageMarks(marks);
    expect(markIntensity(marks, 'ginocchio-fragile')).toBe(0.7);
  });
});

describe('effetti dei segni', () => {
  it('un segno assente non ha effetto', () => {
    expect(markIntensity([], 'bandiera')).toBe(0);
    expect(minutesModifier([])).toBe(0);
    expect(interestModifier([])).toBe(0);
    expect(injuryRiskModifier([])).toBe(0);
  });

  it('il ginocchio fragile alza il rischio di infortunio', () => {
    expect(injuryRiskModifier(addMark([], 'ginocchio-fragile', 1, 1))).toBeCloseTo(0.6, 2);
  });

  it('litigare col mister toglie minuti, essere leader ne dà', () => {
    expect(minutesModifier(addMark([], 'rissa-col-mister', 1, 1))).toBeLessThan(0);
    expect(minutesModifier(addMark([], 'leader-riconosciuto', 1, 1))).toBeGreaterThan(0);
  });

  it('la reputazione da mercenario allontana i club', () => {
    expect(interestModifier(addMark([], 'mercenario', 1, 1))).toBeLessThan(0);
  });

  it("gli effetti sono proporzionali all'intensità", () => {
    const strong = minutesModifier(addMark([], 'rissa-col-mister', 1, 1));
    const faded = minutesModifier(addMark([], 'rissa-col-mister', 0.3, 1));
    expect(Math.abs(faded)).toBeLessThan(Math.abs(strong));
  });

  it('più segni si sommano', () => {
    const both = addMark(addMark([], 'rissa-col-mister', 1, 1), 'leader-riconosciuto', 1, 1);
    const only = addMark([], 'rissa-col-mister', 1, 1);
    expect(minutesModifier(both)).toBeGreaterThan(minutesModifier(only));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/marks.test.ts`
Expected: FAIL — modulo `marks.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/marks.ts`:

```ts
import type { Mark, MarkId } from './types.js';

interface MarkRule {
  /** Un segno permanente non sbiadisce: certe cose restano. */
  permanent: boolean;
  injuryRisk: number;
  minutes: number;
  interest: number;
}

const RULES: Record<MarkId, MarkRule> = {
  'ginocchio-fragile': { permanent: true, injuryRisk: 0.6, minutes: 0, interest: 0 },
  'uomo-spogliatoio': { permanent: false, injuryRisk: 0, minutes: 0.06, interest: 0 },
  'rissa-col-mister': { permanent: false, injuryRisk: 0, minutes: -0.18, interest: 0 },
  mercenario: { permanent: false, injuryRisk: 0, minutes: 0, interest: -0.2 },
  bandiera: { permanent: false, injuryRisk: 0, minutes: 0.02, interest: 0 },
  'beniamino-dei-tifosi': { permanent: false, injuryRisk: 0, minutes: 0.04, interest: 0 },
  'promessa-tradita': { permanent: false, injuryRisk: 0, minutes: 0, interest: -0.12 },
  'tornato-a-casa': { permanent: false, injuryRisk: 0, minutes: 0, interest: 0 },
  'carattere-fragile': { permanent: false, injuryRisk: 0, minutes: -0.08, interest: 0 },
  'leader-riconosciuto': { permanent: false, injuryRisk: 0, minutes: 0.08, interest: 0.1 },
};

const FADE_PER_SEASON = 0.92;
const FORGOTTEN_BELOW = 0.15;

export function addMark(
  marks: readonly Mark[],
  id: MarkId,
  intensity: number,
  season: number,
): Mark[] {
  const existing = marks.find((mark) => mark.id === id);
  if (!existing) {
    return [...marks, { id, intensity: Math.min(1, intensity), seasonAcquired: season }];
  }
  // Rifarlo una seconda volta rinforza il segno, ma con rendimento decrescente.
  const reinforced = Math.min(1, existing.intensity + intensity * (1 - existing.intensity));
  return marks.map((mark) => (mark.id === id ? { ...mark, intensity: reinforced } : mark));
}

/** Fine stagione: i segni sbiadiscono, tranne quelli che non se ne vanno mai. */
export function ageMarks(marks: readonly Mark[]): Mark[] {
  return marks
    .map((mark) =>
      RULES[mark.id].permanent ? mark : { ...mark, intensity: mark.intensity * FADE_PER_SEASON },
    )
    .filter((mark) => RULES[mark.id].permanent || mark.intensity >= FORGOTTEN_BELOW);
}

export function markIntensity(marks: readonly Mark[], id: MarkId): number {
  return marks.find((mark) => mark.id === id)?.intensity ?? 0;
}

function sumEffect(marks: readonly Mark[], pick: (rule: MarkRule) => number): number {
  return marks.reduce((total, mark) => total + pick(RULES[mark.id]) * mark.intensity, 0);
}

export function injuryRiskModifier(marks: readonly Mark[]): number {
  return sumEffect(marks, (rule) => rule.injuryRisk);
}

export function minutesModifier(marks: readonly Mark[]): number {
  return sumEffect(marks, (rule) => rule.minutes);
}

export function interestModifier(marks: readonly Mark[]): number {
  return sumEffect(marks, (rule) => rule.interest);
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/marks.test.ts`
Expected: 13 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/marks.ts tests/engine/marks.test.ts
git commit -m "feat: i Segni, memoria della carriera con decadimento ed effetti"
```

---

### Task 2: Infortuni

Sono il carburante dei bivi più duri e la ragione per cui il Segno `ginocchio-fragile` esiste.

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/injuries.ts`
- Test: `tests/engine/injuries.test.ts`

**Interfaces:**
- Consumes: `Mark`, `injuryRiskModifier`, `Rng`
- Produces:
  - `InjurySeverity` = `'lieve' | 'seria' | 'grave'`
  - `Injury` = `{ severity: InjurySeverity; matchesOut: number; season: number }`
  - `rollInjury(input: InjuryInput, rng: Rng): Injury | null`
  - `InjuryInput` = `{ season: number; age: number; physique: number; minutesShare: number; marks: readonly Mark[] }`
  - `injuryMinutesPenalty(injury: Injury | null): number` — quota di stagione persa

Rischio base per stagione: `0,10 + max(0, età − 29) × 0,015 + (1 − fisico/100) × 0,12`, moltiplicato per la quota di minuti giocati (chi non scende in campo non si fa male) e alzato dai Segni. Gravità: 70% lieve (2-5 partite), 25% seria (8-16), 5% grave (22-34).

- [ ] **Step 1: Aggiungere i tipi**

In `src/engine/types.ts`:

```ts
export type InjurySeverity = 'lieve' | 'seria' | 'grave';

export interface Injury {
  severity: InjurySeverity;
  matchesOut: number;
  season: number;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/injuries.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { injuryMinutesPenalty, rollInjury, type InjuryInput } from '../../src/engine/injuries.js';
import { addMark } from '../../src/engine/marks.js';
import { createRng } from '../../src/engine/rng.js';

const healthy: InjuryInput = {
  season: 5, age: 24, physique: 70, minutesShare: 0.8, marks: [],
};

function injuryRate(input: InjuryInput): number {
  let hurt = 0;
  for (let seed = 0; seed < 2000; seed += 1) {
    if (rollInjury(input, createRng(seed))) hurt += 1;
  }
  return hurt / 2000;
}

describe('rollInjury', () => {
  it('un titolare sano si infortuna qualche volta, non ogni anno', () => {
    const rate = injuryRate(healthy);
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.35);
  });

  it('chi non gioca non si fa male', () => {
    expect(injuryRate({ ...healthy, minutesShare: 0.02 })).toBeLessThan(0.02);
  });

  it('a trentasei anni ci si fa male più che a ventiquattro', () => {
    expect(injuryRate({ ...healthy, age: 36 })).toBeGreaterThan(injuryRate(healthy) + 0.05);
  });

  it('un fisico di ferro protegge', () => {
    expect(injuryRate({ ...healthy, physique: 90 }))
      .toBeLessThan(injuryRate({ ...healthy, physique: 45 }));
  });

  it('il ginocchio fragile fa ricadere', () => {
    const fragile = { ...healthy, marks: addMark([], 'ginocchio-fragile', 1, 1) };
    expect(injuryRate(fragile)).toBeGreaterThan(injuryRate(healthy) + 0.03);
  });

  it('gli infortuni gravi sono rari, quelli lievi comuni', () => {
    const counts = { lieve: 0, seria: 0, grave: 0 };
    for (let seed = 0; seed < 5000; seed += 1) {
      const injury = rollInjury(healthy, createRng(seed));
      if (injury) counts[injury.severity] += 1;
    }
    const total = counts.lieve + counts.seria + counts.grave;
    expect(counts.lieve / total).toBeGreaterThan(0.5);
    expect(counts.grave / total).toBeLessThan(0.15);
  });

  it("l'infortunio dice quante partite si saltano e in che stagione", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const injury = rollInjury(healthy, createRng(seed));
      if (!injury) continue;
      expect(injury.matchesOut).toBeGreaterThan(0);
      expect(injury.matchesOut).toBeLessThanOrEqual(34);
      expect(injury.season).toBe(5);
    }
  });

  it('è deterministico', () => {
    expect(rollInjury(healthy, createRng(3))).toEqual(rollInjury(healthy, createRng(3)));
  });
});

describe('injuryMinutesPenalty', () => {
  it('senza infortuni non si perde niente', () => {
    expect(injuryMinutesPenalty(null)).toBe(0);
  });

  it('più partite si saltano, più stagione si perde', () => {
    const light = injuryMinutesPenalty({ severity: 'lieve', matchesOut: 3, season: 1 });
    const heavy = injuryMinutesPenalty({ severity: 'grave', matchesOut: 30, season: 1 });
    expect(heavy).toBeGreaterThan(light);
    expect(heavy).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/injuries.test.ts`
Expected: FAIL — modulo `injuries.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/injuries.ts`:

```ts
import { injuryRiskModifier } from './marks.js';
import type { Rng } from './rng.js';
import type { Injury, InjurySeverity, Mark } from './types.js';

export interface InjuryInput {
  season: number;
  age: number;
  physique: number;
  minutesShare: number;
  marks: readonly Mark[];
}

const MATCHES_PER_SEASON = 38;

const SEVERITY_TABLE: readonly { severity: InjurySeverity; upTo: number; min: number; max: number }[] = [
  { severity: 'lieve', upTo: 0.7, min: 2, max: 5 },
  { severity: 'seria', upTo: 0.95, min: 8, max: 16 },
  { severity: 'grave', upTo: 1, min: 22, max: 34 },
];

export function rollInjury(input: InjuryInput, rng: Rng): Injury | null {
  const base =
    0.1 + Math.max(0, input.age - 29) * 0.015 + (1 - input.physique / 100) * 0.12;
  // Ci si fa male in campo: chi resta in tribuna non si infortuna.
  const exposure = input.minutesShare;
  const risk = base * exposure * (1 + injuryRiskModifier(input.marks));

  if (!rng.chance(risk)) return null;

  const roll = rng.next();
  const row = SEVERITY_TABLE.find((entry) => roll <= entry.upTo) ?? SEVERITY_TABLE[0]!;
  return {
    severity: row.severity,
    matchesOut: rng.int(row.min, row.max),
    season: input.season,
  };
}

/** Quota di stagione persa per infortunio, fra 0 e 1. */
export function injuryMinutesPenalty(injury: Injury | null): number {
  if (!injury) return 0;
  return Math.min(1, injury.matchesOut / MATCHES_PER_SEASON);
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/injuries.test.ts`
Expected: 10 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/injuries.ts tests/engine/injuries.test.ts
git commit -m "feat: infortuni con gravita, minuti persi e rischio legato ai Segni"
```

---

### Task 3: Il catalogo dei bivi

I testi del gioco. Ogni voce dichiara **quando** può capitare e **cosa si mette in gioco**: è il cuore della spec §3.5.

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/dilemmaCatalog.ts`
- Test: `tests/engine/dilemmaCatalog.test.ts`

**Interfaces:**
- Consumes: `MarkId`
- Produces:
  - `DilemmaEffects` = `{ overall?: number; minutesDelta?: number; addMark?: { id: MarkId; intensity: number }; removeMark?: MarkId; retirementDelta?: number; valueMultiplier?: number }`
  - `DilemmaOutcome` = `{ chance: number; text: string; effects: DilemmaEffects }`
  - `DilemmaOption` = `{ id: string; label: string; stake: string; outcomes: DilemmaOutcome[] }`
  - `Dilemma` = `{ id: string; title: string; text: string; options: DilemmaOption[] }`
  - `DilemmaContext` = `{ season: number; age: number; overall: number; minutesShare: number; injury: Injury | null; marks: readonly Mark[]; clubName: string; leagueLevel: number; contractYearsLeft: number; wonSomething: boolean }`
  - `DilemmaEntry` = `{ id: string; weight: number; when: (context: DilemmaContext) => boolean; build: (context: DilemmaContext) => Dilemma }`
  - `DILEMMA_CATALOG: readonly DilemmaEntry[]` — otto voci nella V1

**Regola sulle probabilità:** in ogni opzione la somma dei `chance` deve fare esattamente 1. C'è un test che lo verifica su tutto il catalogo.

- [ ] **Step 1: Aggiungere i tipi**

In `src/engine/types.ts`:

```ts
/** Cosa cambia dopo una scelta. Tutti i campi sono opzionali: un esito può non fare niente. */
export interface DilemmaEffects {
  /** Punti di overall, in più o in meno, subito. */
  overall?: number;
  /** Minuti guadagnati o persi nella stagione successiva. */
  minutesDelta?: number;
  addMark?: { id: MarkId; intensity: number };
  removeMark?: MarkId;
  /** Anni di carriera guadagnati o bruciati. */
  retirementDelta?: number;
  valueMultiplier?: number;
}

export interface DilemmaOutcome {
  /** Probabilità dell'esito: la somma delle opzioni di un bivio fa 1. */
  chance: number;
  text: string;
  effects: DilemmaEffects;
}

export interface DilemmaOption {
  id: string;
  label: string;
  /** La posta dichiarata: cosa rischi e cosa guadagni, in chiaro (spec §3.5). */
  stake: string;
  outcomes: DilemmaOutcome[];
}

export interface Dilemma {
  id: string;
  title: string;
  text: string;
  options: DilemmaOption[];
}

/** Cosa il giocatore ha deciso, e com'è andata. */
export interface DilemmaChoice {
  dilemmaId: string;
  optionId: string;
  optionLabel: string;
  outcomeText: string;
  season: number;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/dilemmaCatalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DILEMMA_CATALOG, type DilemmaContext } from '../../src/engine/dilemmaCatalog.js';
import { addMark } from '../../src/engine/marks.js';

const base: DilemmaContext = {
  season: 5, age: 24, overall: 72, minutesShare: 0.7, injury: null, marks: [],
  clubName: 'Napoli', leagueLevel: 1, contractYearsLeft: 2, wonSomething: false,
};

describe('catalogo dei bivi', () => {
  it('contiene almeno otto bivi', () => {
    expect(DILEMMA_CATALOG.length).toBeGreaterThanOrEqual(8);
  });

  it('ogni bivio ha un id unico', () => {
    const ids = DILEMMA_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('le probabilità di ogni opzione sommano a uno', () => {
    for (const entry of DILEMMA_CATALOG) {
      const dilemma = entry.build({
        ...base,
        injury: { severity: 'seria', matchesOut: 12, season: 5 },
      });
      for (const option of dilemma.options) {
        const total = option.outcomes.reduce((sum, outcome) => sum + outcome.chance, 0);
        expect(total, `${dilemma.id} / ${option.id}`).toBeCloseTo(1, 5);
      }
    }
  });

  it('ogni bivio offre almeno due strade', () => {
    for (const entry of DILEMMA_CATALOG) {
      const dilemma = entry.build({
        ...base,
        injury: { severity: 'grave', matchesOut: 26, season: 5 },
      });
      expect(dilemma.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('ogni opzione dichiara la posta in gioco', () => {
    for (const entry of DILEMMA_CATALOG) {
      const dilemma = entry.build({
        ...base,
        injury: { severity: 'seria', matchesOut: 12, season: 5 },
      });
      for (const option of dilemma.options) {
        expect(option.stake.length, `${dilemma.id} / ${option.id}`).toBeGreaterThan(10);
        expect(option.label.length).toBeGreaterThan(2);
      }
    }
  });

  it('i testi sono in italiano e parlano del club vero', () => {
    const entry = DILEMMA_CATALOG.find((item) => item.id === 'rinnovo-o-addio')!;
    const dilemma = entry.build({ ...base, contractYearsLeft: 0 });
    expect(dilemma.text).toContain('Napoli');
  });

  it("il bivio dell'infortunio si presenta solo se sei infortunato", () => {
    const entry = DILEMMA_CATALOG.find((item) => item.id === 'rientro-anticipato')!;
    expect(entry.when(base)).toBe(false);
    expect(entry.when({ ...base, injury: { severity: 'seria', matchesOut: 12, season: 5 } })).toBe(true);
  });

  it('il bivio della panchina si presenta solo a chi non gioca', () => {
    const entry = DILEMMA_CATALOG.find((item) => item.id === 'panchina-lunga')!;
    expect(entry.when({ ...base, minutesShare: 0.8 })).toBe(false);
    expect(entry.when({ ...base, minutesShare: 0.1 })).toBe(true);
  });

  it('esiste almeno un bivio che si apre per via di un Segno passato', () => {
    const contextWithMark = { ...base, marks: addMark([], 'rissa-col-mister', 0.8, 2) };
    const opened = DILEMMA_CATALOG.filter(
      (entry) => !entry.when(base) && entry.when(contextWithMark),
    );
    expect(opened.length).toBeGreaterThan(0);
  });

  it('almeno un bivio può lasciare un Segno permanente', () => {
    const entry = DILEMMA_CATALOG.find((item) => item.id === 'rientro-anticipato')!;
    const dilemma = entry.build({
      ...base, injury: { severity: 'grave', matchesOut: 28, season: 5 },
    });
    const leavesMark = dilemma.options.some((option) =>
      option.outcomes.some((outcome) => outcome.effects.addMark?.id === 'ginocchio-fragile'),
    );
    expect(leavesMark).toBe(true);
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/dilemmaCatalog.test.ts`
Expected: FAIL — modulo `dilemmaCatalog.js` non trovato.

- [ ] **Step 4: Implementare il catalogo**

`src/engine/dilemmaCatalog.ts`:

```ts
import { markIntensity } from './marks.js';
import type { Dilemma, Injury, Mark } from './types.js';

export interface DilemmaContext {
  season: number;
  age: number;
  overall: number;
  minutesShare: number;
  injury: Injury | null;
  marks: readonly Mark[];
  clubName: string;
  leagueLevel: number;
  contractYearsLeft: number;
  wonSomething: boolean;
}

export interface DilemmaEntry {
  id: string;
  /** Peso nell'estrazione: quanto spesso questo bivio si presenta, fra quelli possibili. */
  weight: number;
  when: (context: DilemmaContext) => boolean;
  build: (context: DilemmaContext) => Dilemma;
}

/**
 * Il catalogo dei bivi della V1: otto situazioni, ognuna con la posta dichiarata.
 * I testi stanno qui e non nel motore, così la traduzione della Fase 5 non tocca la logica.
 */
export const DILEMMA_CATALOG: readonly DilemmaEntry[] = [
  {
    id: 'rientro-anticipato',
    weight: 3,
    when: (context) => context.injury !== null && context.injury.severity !== 'lieve',
    build: (context) => ({
      id: 'rientro-anticipato',
      title: 'Il ginocchio non tiene',
      text: `Il medico del ${context.clubName} parla di ${context.injury?.matchesOut ?? 10} partite. L'agente ricorda che una stagione in bianco, a ${context.age} anni, la gente la nota.`,
      options: [
        {
          id: 'aspetta',
          label: 'Aspetta di guarire davvero',
          stake: 'Perdi mezza stagione, ma torni intero.',
          outcomes: [
            {
              chance: 1,
              text: 'Rientri quando il ginocchio è a posto. Nessuno strascico.',
              effects: { minutesDelta: -0.1 },
            },
          ],
        },
        {
          id: 'anticipa',
          label: 'Rientra un mese prima',
          stake: '70% torni come prima, 30% te lo porti dietro per sempre.',
          outcomes: [
            {
              chance: 0.7,
              text: 'Il rientro regge. Sei di nuovo in campo prima del previsto.',
              effects: { minutesDelta: 0.08 },
            },
            {
              chance: 0.3,
              text: 'Il ginocchio cede di nuovo. Da qui in avanti dovrai conviverci.',
              effects: {
                addMark: { id: 'ginocchio-fragile', intensity: 0.8 },
                overall: -2,
                retirementDelta: -2,
              },
            },
          ],
        },
        {
          id: 'infiltrazioni',
          label: 'Infiltrazioni, gioca comunque',
          stake: 'Giochi subito e ti fai notare, ma bruci anni di carriera.',
          outcomes: [
            {
              chance: 0.55,
              text: 'Stringi i denti e giochi. Lo spogliatoio se lo ricorda.',
              effects: {
                minutesDelta: 0.12,
                addMark: { id: 'leader-riconosciuto', intensity: 0.5 },
                retirementDelta: -3,
              },
            },
            {
              chance: 0.45,
              text: 'Il dolore non passa più. Il ginocchio è compromesso.',
              effects: {
                addMark: { id: 'ginocchio-fragile', intensity: 1 },
                overall: -3,
                retirementDelta: -4,
              },
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'panchina-lunga',
    weight: 3,
    when: (context) => context.minutesShare < 0.25 && context.injury === null,
    build: (context) => ({
      id: 'panchina-lunga',
      title: 'Non giochi più',
      text: `Sono mesi che al ${context.clubName} entri nei finali. Il mister non ti guarda nemmeno più durante il riscaldamento.`,
      options: [
        {
          id: 'lavora',
          label: 'Testa bassa e lavora',
          stake: 'Nessun rischio, nessuna scorciatoia.',
          outcomes: [
            {
              chance: 0.6,
              text: 'A gennaio qualcosa si muove: torni fra i convocati.',
              effects: { minutesDelta: 0.08, addMark: { id: 'uomo-spogliatoio', intensity: 0.4 } },
            },
            {
              chance: 0.4,
              text: 'Niente da fare. La stagione passa dalla panchina.',
              effects: { minutesDelta: -0.03 },
            },
          ],
        },
        {
          id: 'parla',
          label: 'Vai a parlare col mister',
          stake: 'Può aprirti le porte o chiudertele in faccia.',
          outcomes: [
            {
              chance: 0.5,
              text: 'Il confronto è duro ma onesto. Ti dà una possibilità.',
              effects: { minutesDelta: 0.18 },
            },
            {
              chance: 0.5,
              text: 'Finisce male. Da domani ti allena col gruppo dei fuori rosa.',
              effects: {
                minutesDelta: -0.12,
                addMark: { id: 'rissa-col-mister', intensity: 0.7 },
              },
            },
          ],
        },
        {
          id: 'chiedi-cessione',
          label: 'Chiedi la cessione',
          stake: 'Te ne vai a giocare, ma la piazza non perdona.',
          outcomes: [
            {
              chance: 1,
              text: `Chiedi di andare via. Il ${context.clubName} ti mette sul mercato.`,
              effects: {
                addMark: { id: 'mercenario', intensity: 0.5 },
                minutesDelta: 0.05,
              },
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'rinnovo-o-addio',
    weight: 3,
    when: (context) => context.contractYearsLeft <= 0,
    build: (context) => ({
      id: 'rinnovo-o-addio',
      title: 'Il contratto scade',
      text: `Il ${context.clubName} mette sul tavolo il rinnovo. Il tuo agente dice che aspettando la scadenza guadagneresti il doppio altrove.`,
      options: [
        {
          id: 'rinnova',
          label: 'Firma il rinnovo',
          stake: 'Meno soldi, ma la piazza ti adotta.',
          outcomes: [
            {
              chance: 1,
              text: 'Firmi. I tifosi apprezzano chi resta.',
              effects: {
                addMark: { id: 'bandiera', intensity: 0.5 },
                minutesDelta: 0.05,
              },
            },
          ],
        },
        {
          id: 'aspetta-scadenza',
          label: 'Aspetta la scadenza',
          stake: 'Guadagni di più, ma passi per uno che se ne va a zero.',
          outcomes: [
            {
              chance: 0.6,
              text: 'Arrivi a scadenza con le offerte in mano. Affare fatto.',
              effects: {
                valueMultiplier: 1.15,
                addMark: { id: 'mercenario', intensity: 0.4 },
              },
            },
            {
              chance: 0.4,
              text: 'La piazza la prende malissimo. Ogni pallone toccato è un fischio.',
              effects: {
                addMark: { id: 'promessa-tradita', intensity: 0.6 },
                minutesDelta: -0.08,
              },
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'intervista-dopo-la-sconfitta',
    weight: 2,
    when: (context) => context.minutesShare >= 0.35 && !context.wonSomething,
    build: (context) => ({
      id: 'intervista-dopo-la-sconfitta',
      title: 'Il microfono davanti alla bocca',
      text: `Un'altra sconfitta. Nel corridoio del ${context.clubName} ti mettono un microfono davanti mentre sei ancora arrabbiato.`,
      options: [
        {
          id: 'difendi',
          label: 'Difendi il gruppo',
          stake: 'Nessun titolo sui giornali, ma lo spogliatoio se lo ricorda.',
          outcomes: [
            {
              chance: 1,
              text: 'Ti prendi tu la responsabilità. Dentro se ne accorgono.',
              effects: { addMark: { id: 'uomo-spogliatoio', intensity: 0.5 } },
            },
          ],
        },
        {
          id: 'attacca',
          label: 'Dì quello che pensi davvero',
          stake: 'I tifosi ti amano, il mister molto meno.',
          outcomes: [
            {
              chance: 0.5,
              text: 'La curva ti applaude: finalmente qualcuno che parla chiaro.',
              effects: {
                addMark: { id: 'beniamino-dei-tifosi', intensity: 0.6 },
                minutesDelta: -0.05,
              },
            },
            {
              chance: 0.5,
              text: "L'allenatore la prende sul personale. Ti costa il posto.",
              effects: {
                addMark: { id: 'rissa-col-mister', intensity: 0.6 },
                minutesDelta: -0.15,
              },
            },
          ],
        },
        {
          id: 'niente',
          label: 'Nessun commento',
          stake: 'Non succede niente, nel bene e nel male.',
          outcomes: [
            { chance: 1, text: 'Passi oltre senza parlare.', effects: {} },
          ],
        },
      ],
    }),
  },
  {
    id: 'pace-col-mister',
    weight: 3,
    when: (context) => markIntensity(context.marks, 'rissa-col-mister') > 0.3,
    build: (context) => ({
      id: 'pace-col-mister',
      title: 'Quella frase pesa ancora',
      text: `Da quando hai alzato la voce non sei più lo stesso agli occhi della panchina. Al ${context.clubName} qualcuno prova a ricucire.`,
      options: [
        {
          id: 'scusati',
          label: 'Fai il primo passo',
          stake: "Ti costa l'orgoglio, ma cancella il passato.",
          outcomes: [
            {
              chance: 0.7,
              text: 'Vi chiarite davanti a tutti. Il caso è chiuso.',
              effects: { removeMark: 'rissa-col-mister', minutesDelta: 0.1 },
            },
            {
              chance: 0.3,
              text: 'Ti ascolta, annuisce, e non cambia niente.',
              effects: {},
            },
          ],
        },
        {
          id: 'tieni-il-punto',
          label: 'Non hai niente di cui scusarti',
          stake: 'Resti te stesso, ma il muro resta in piedi.',
          outcomes: [
            {
              chance: 1,
              text: 'Nessuno fa il primo passo. Si va avanti così.',
              effects: { addMark: { id: 'carattere-fragile', intensity: 0.3 } },
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'fascia-di-capitano',
    weight: 2,
    when: (context) => context.age >= 27 && context.minutesShare >= 0.6,
    build: (context) => ({
      id: 'fascia-di-capitano',
      title: 'La fascia',
      text: `Il capitano del ${context.clubName} ha chiuso. In sala video ti chiedono se te la senti di prendere la fascia.`,
      options: [
        {
          id: 'accetta',
          label: 'Prendi la fascia',
          stake: 'Più peso sulle spalle, più peso nello spogliatoio.',
          outcomes: [
            {
              chance: 0.75,
              text: 'Il gruppo ti segue. Sei tu che parli, adesso.',
              effects: {
                addMark: { id: 'leader-riconosciuto', intensity: 0.8 },
                minutesDelta: 0.05,
              },
            },
            {
              chance: 0.25,
              text: 'La responsabilità ti pesa addosso più di quanto pensassi.',
              effects: { addMark: { id: 'carattere-fragile', intensity: 0.5 } },
            },
          ],
        },
        {
          id: 'rifiuta',
          label: 'Lascia perdere',
          stake: 'Niente pressione, ma qualcuno se lo segna.',
          outcomes: [
            { chance: 1, text: 'Preferisci pensare a giocare. Legittimo.', effects: {} },
          ],
        },
      ],
    }),
  },
  {
    id: 'il-ragazzino',
    weight: 2,
    when: (context) => context.age >= 29 && context.minutesShare >= 0.4,
    build: (context) => ({
      id: 'il-ragazzino',
      title: 'Il ragazzino del vivaio',
      text: `Al ${context.clubName} è salito un diciottenne che nel tuo ruolo fa cose che tu a quell'età non facevi. Il posto è uno.`,
      options: [
        {
          id: 'aiutalo',
          label: 'Prendilo sotto braccio',
          stake: 'Ti toglie minuti, ti dà una reputazione.',
          outcomes: [
            {
              chance: 1,
              text: 'Gli insegni il mestiere. In società lo notano.',
              effects: {
                addMark: { id: 'leader-riconosciuto', intensity: 0.6 },
                minutesDelta: -0.08,
              },
            },
          ],
        },
        {
          id: 'ignoralo',
          label: 'Fatti trovare pronto e basta',
          stake: 'Difendi il posto, ma lo spogliatoio ti guarda.',
          outcomes: [
            {
              chance: 0.6,
              text: 'Il campo dice che il titolare sei ancora tu.',
              effects: { minutesDelta: 0.06 },
            },
            {
              chance: 0.4,
              text: 'Il ragazzino gioca lo stesso, e tu passi per quello scomodo.',
              effects: {
                minutesDelta: -0.1,
                addMark: { id: 'carattere-fragile', intensity: 0.4 },
              },
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'ritorno-a-casa',
    weight: 2,
    when: (context) => context.age >= 31 && context.leagueLevel <= 2,
    build: (context) => ({
      id: 'ritorno-a-casa',
      title: 'La squadra di quando eri bambino',
      text: `Ti cerca la squadra della tua città. Categoria più bassa, stipendio più basso, ma è casa. Al ${context.clubName} ti terrebbero ancora un anno.`,
      options: [
        {
          id: 'torna',
          label: 'Torna a casa',
          stake: 'Chiudi la carriera dove è cominciata, ma rinunci al palcoscenico.',
          outcomes: [
            {
              chance: 1,
              text: 'Firmi dove hai imparato a giocare. Lo stadio si alza in piedi.',
              effects: {
                addMark: { id: 'tornato-a-casa', intensity: 1 },
                minutesDelta: 0.15,
                valueMultiplier: 0.8,
              },
            },
          ],
        },
        {
          id: 'resta',
          label: 'Resta dove sei',
          stake: 'Ancora un anno ad alto livello, finché il fisico regge.',
          outcomes: [
            { chance: 1, text: 'Non è ancora il momento dei saluti.', effects: {} },
          ],
        },
      ],
    }),
  },
];
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/dilemmaCatalog.test.ts`
Expected: 10 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/dilemmaCatalog.ts tests/engine/dilemmaCatalog.test.ts
git commit -m "feat: catalogo degli otto bivi con la posta dichiarata"
```

---

### Task 4: Selezione e risoluzione dei bivi

**Files:**
- Create: `src/engine/dilemmas.ts`
- Test: `tests/engine/dilemmas.test.ts`

**Interfaces:**
- Consumes: `DILEMMA_CATALOG`, `DilemmaContext`, `Rng`, `addMark`
- Produces:
  - `pickDilemmas(context: DilemmaContext, rng: Rng): Dilemma[]` — da 0 a 3 bivi per stagione, senza ripetizioni
  - `resolveOption(option: DilemmaOption, rng: Rng): DilemmaOutcome`
  - `applyEffects(state: DilemmaState, effects: DilemmaEffects, season: number): DilemmaState`
  - `DilemmaState` = `{ overall: number; marks: Mark[]; minutesDelta: number; retirementDelta: number; valueMultiplier: number }`
  - `DilemmaPolicy` = `(dilemma: Dilemma, context: DilemmaContext) => DilemmaOption`
  - `boldPolicy: DilemmaPolicy` — la policy del Lab: sceglie sempre l'opzione con il valore atteso più alto sui minuti

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/dilemmas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { DilemmaContext } from '../../src/engine/dilemmaCatalog.js';
import {
  applyEffects, boldPolicy, pickDilemmas, resolveOption, type DilemmaState,
} from '../../src/engine/dilemmas.js';
import { addMark, markIntensity } from '../../src/engine/marks.js';
import { createRng } from '../../src/engine/rng.js';
import type { DilemmaOption } from '../../src/engine/types.js';

const base: DilemmaContext = {
  season: 5, age: 24, overall: 72, minutesShare: 0.7, injury: null, marks: [],
  clubName: 'Napoli', leagueLevel: 1, contractYearsLeft: 2, wonSomething: false,
};

const emptyState: DilemmaState = {
  overall: 72, marks: [], minutesDelta: 0, retirementDelta: 0, valueMultiplier: 1,
};

describe('pickDilemmas', () => {
  it('non propone mai più di tre bivi in una stagione', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      expect(pickDilemmas(base, createRng(seed)).length).toBeLessThanOrEqual(3);
    }
  });

  it('non propone due volte lo stesso bivio nella stessa stagione', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const picked = pickDilemmas(base, createRng(seed));
      expect(new Set(picked.map((d) => d.id)).size).toBe(picked.length);
    }
  });

  it('propone solo bivi compatibili con la situazione', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const picked = pickDilemmas({ ...base, minutesShare: 0.8 }, createRng(seed));
      expect(picked.some((d) => d.id === 'panchina-lunga')).toBe(false);
      expect(picked.some((d) => d.id === 'rientro-anticipato')).toBe(false);
    }
  });

  it("chi è infortunato incontra il bivio dell'infortunio", () => {
    const hurt = { ...base, injury: { severity: 'grave' as const, matchesOut: 28, season: 5 } };
    let seen = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (pickDilemmas(hurt, createRng(seed)).some((d) => d.id === 'rientro-anticipato')) seen += 1;
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('un Segno vecchio apre un bivio che prima non esisteva', () => {
    const withMark = { ...base, marks: addMark([], 'rissa-col-mister', 0.8, 2) };
    let seen = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (pickDilemmas(withMark, createRng(seed)).some((d) => d.id === 'pace-col-mister')) seen += 1;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('è deterministico', () => {
    expect(pickDilemmas(base, createRng(4))).toEqual(pickDilemmas(base, createRng(4)));
  });
});

describe('resolveOption', () => {
  const option: DilemmaOption = {
    id: 'test', label: 'Prova', stake: 'Una posta qualunque',
    outcomes: [
      { chance: 0.7, text: 'Va bene', effects: { overall: 1 } },
      { chance: 0.3, text: 'Va male', effects: { overall: -1 } },
    ],
  };

  it('restituisce sempre uno degli esiti previsti', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      expect(option.outcomes).toContain(resolveOption(option, createRng(seed)));
    }
  });

  it('rispetta le probabilità dichiarate', () => {
    let good = 0;
    for (let seed = 0; seed < 2000; seed += 1) {
      if (resolveOption(option, createRng(seed)).text === 'Va bene') good += 1;
    }
    expect(good / 2000).toBeGreaterThan(0.63);
    expect(good / 2000).toBeLessThan(0.77);
  });

  it('è deterministico', () => {
    expect(resolveOption(option, createRng(9))).toBe(resolveOption(option, createRng(9)));
  });
});

describe('applyEffects', () => {
  it('somma i punti di overall', () => {
    expect(applyEffects(emptyState, { overall: -3 }, 5).overall).toBe(69);
  });

  it('aggiunge un Segno', () => {
    const state = applyEffects(emptyState, { addMark: { id: 'bandiera', intensity: 0.5 } }, 5);
    expect(markIntensity(state.marks, 'bandiera')).toBe(0.5);
  });

  it('toglie un Segno', () => {
    const withMark: DilemmaState = { ...emptyState, marks: addMark([], 'rissa-col-mister', 0.8, 1) };
    const state = applyEffects(withMark, { removeMark: 'rissa-col-mister' }, 5);
    expect(markIntensity(state.marks, 'rissa-col-mister')).toBe(0);
  });

  it('accumula i minuti e gli anni di carriera', () => {
    const once = applyEffects(emptyState, { minutesDelta: 0.1, retirementDelta: -2 }, 5);
    const twice = applyEffects(once, { minutesDelta: 0.05, retirementDelta: -1 }, 6);
    expect(twice.minutesDelta).toBeCloseTo(0.15, 5);
    expect(twice.retirementDelta).toBe(-3);
  });

  it('moltiplica il valore', () => {
    const state = applyEffects(emptyState, { valueMultiplier: 1.2 }, 5);
    expect(state.valueMultiplier).toBeCloseTo(1.2, 5);
  });

  it('un effetto vuoto non cambia niente', () => {
    expect(applyEffects(emptyState, {}, 5)).toEqual(emptyState);
  });

  it('non muta lo stato che riceve', () => {
    applyEffects(emptyState, { overall: 5, addMark: { id: 'bandiera', intensity: 1 } }, 5);
    expect(emptyState.overall).toBe(72);
    expect(emptyState.marks).toHaveLength(0);
  });
});

describe('boldPolicy', () => {
  it('sceglie sempre una delle opzioni offerte', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const picked = pickDilemmas(
        { ...base, minutesShare: 0.1 }, createRng(seed),
      );
      for (const dilemma of picked) {
        expect(dilemma.options).toContain(boldPolicy(dilemma, base));
      }
    }
  });

  it('chi non gioca preferisce l\'opzione che promette più campo', () => {
    const dilemma = pickDilemmas(
      { ...base, minutesShare: 0.05 }, createRng(1),
    ).find((d) => d.id === 'panchina-lunga');
    if (dilemma) {
      const chosen = boldPolicy(dilemma, { ...base, minutesShare: 0.05 });
      expect(['parla', 'chiedi-cessione']).toContain(chosen.id);
    }
  });

  it('è deterministica', () => {
    const dilemmas = pickDilemmas(base, createRng(2));
    for (const dilemma of dilemmas) {
      expect(boldPolicy(dilemma, base).id).toBe(boldPolicy(dilemma, base).id);
    }
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/dilemmas.test.ts`
Expected: FAIL — modulo `dilemmas.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/dilemmas.ts`:

```ts
import { DILEMMA_CATALOG, type DilemmaContext } from './dilemmaCatalog.js';
import { addMark } from './marks.js';
import type { Rng } from './rng.js';
import type { Dilemma, DilemmaEffects, DilemmaOption, DilemmaOutcome, Mark } from './types.js';

/** Quanto cambia una stagione per effetto delle scelte fatte. */
export interface DilemmaState {
  overall: number;
  marks: Mark[];
  minutesDelta: number;
  retirementDelta: number;
  valueMultiplier: number;
}

const MAX_PER_SEASON = 3;

/**
 * Estrae i bivi della stagione fra quelli compatibili con la situazione.
 * I pesi decidono quanto spesso una situazione si presenta rispetto alle altre.
 */
export function pickDilemmas(context: DilemmaContext, rng: Rng): Dilemma[] {
  const available = DILEMMA_CATALOG.filter((entry) => entry.when(context));
  const picked: Dilemma[] = [];
  const used = new Set<string>();

  const howMany = Math.min(MAX_PER_SEASON, available.length, rng.int(1, MAX_PER_SEASON));

  for (let i = 0; i < howMany; i += 1) {
    const pool = available.filter((entry) => !used.has(entry.id));
    if (pool.length === 0) break;

    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng.next() * totalWeight;
    const chosen = pool.find((entry) => {
      roll -= entry.weight;
      return roll <= 0;
    }) ?? pool[0]!;

    used.add(chosen.id);
    picked.push(chosen.build(context));
  }

  return picked;
}

/** Estrae un esito rispettando le probabilità dichiarate all'utente. */
export function resolveOption(option: DilemmaOption, rng: Rng): DilemmaOutcome {
  let roll = rng.next();
  for (const outcome of option.outcomes) {
    roll -= outcome.chance;
    if (roll <= 0) return outcome;
  }
  return option.outcomes[option.outcomes.length - 1]!;
}

export function applyEffects(
  state: DilemmaState,
  effects: DilemmaEffects,
  season: number,
): DilemmaState {
  let marks = state.marks;
  if (effects.removeMark) {
    marks = marks.filter((mark) => mark.id !== effects.removeMark);
  }
  if (effects.addMark) {
    marks = addMark(marks, effects.addMark.id, effects.addMark.intensity, season);
  }

  return {
    overall: state.overall + (effects.overall ?? 0),
    marks,
    minutesDelta: state.minutesDelta + (effects.minutesDelta ?? 0),
    retirementDelta: state.retirementDelta + (effects.retirementDelta ?? 0),
    valueMultiplier: state.valueMultiplier * (effects.valueMultiplier ?? 1),
  };
}

export type DilemmaPolicy = (dilemma: Dilemma, context: DilemmaContext) => DilemmaOption;

/** Valore atteso di un'opzione, dal punto di vista di chi vuole giocare e restare forte. */
function expectedValue(option: DilemmaOption): number {
  return option.outcomes.reduce((total, outcome) => {
    const effects = outcome.effects;
    const value =
      (effects.minutesDelta ?? 0) * 3 +
      (effects.overall ?? 0) * 0.5 +
      (effects.retirementDelta ?? 0) * 0.15 +
      ((effects.valueMultiplier ?? 1) - 1) * 2;
    return total + outcome.chance * value;
  }, 0);
}

/**
 * La scelta automatica del Simulation Lab: prende l'opzione col valore atteso migliore.
 * In Fase 4 al suo posto ci sarà l'utente, che potrà scegliere anche col cuore.
 */
export const boldPolicy: DilemmaPolicy = (dilemma) =>
  dilemma.options.reduce((best, option) =>
    expectedValue(option) > expectedValue(best) ? option : best,
  );
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/dilemmas.test.ts`
Expected: 19 test passati.

- [ ] **Step 5: Commit**

```bash
git add src/engine/dilemmas.ts tests/engine/dilemmas.test.ts
git commit -m "feat: selezione contestuale dei bivi, risoluzione e policy automatica"
```

---

### Task 5: Il contratto

Chiude D-008: senza durata del contratto si cambia squadra ogni estate, e il bivio del rinnovo non ha senso.

**Files:**
- Create: `src/engine/contract.ts`
- Test: `tests/engine/contract.test.ts`

**Interfaces:**
- Consumes: `Rng`
- Produces:
  - `Contract` = `{ yearsLeft: number; signedInSeason: number }`
  - `signContract(season: number, age: number, rng: Rng): Contract`
  - `tickContract(contract: Contract): Contract`
  - `canLeave(contract: Contract): boolean` — si cambia squadra solo all'ultimo anno o a scadenza

- [ ] **Step 1: Scrivere i test che falliscono**

`tests/engine/contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canLeave, signContract, tickContract } from '../../src/engine/contract.js';
import { createRng } from '../../src/engine/rng.js';

describe('signContract', () => {
  it('un giovane firma contratti lunghi', () => {
    let total = 0;
    for (let seed = 0; seed < 200; seed += 1) total += signContract(1, 19, createRng(seed)).yearsLeft;
    expect(total / 200).toBeGreaterThan(3);
  });

  it('un veterano firma contratti corti', () => {
    let total = 0;
    for (let seed = 0; seed < 200; seed += 1) total += signContract(1, 35, createRng(seed)).yearsLeft;
    expect(total / 200).toBeLessThan(2.5);
  });

  it('la durata resta fra uno e cinque anni', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      for (const age of [17, 24, 31, 38]) {
        const contract = signContract(3, age, createRng(seed));
        expect(contract.yearsLeft).toBeGreaterThanOrEqual(1);
        expect(contract.yearsLeft).toBeLessThanOrEqual(5);
        expect(contract.signedInSeason).toBe(3);
      }
    }
  });
});

describe('tickContract', () => {
  it('ogni stagione toglie un anno', () => {
    expect(tickContract({ yearsLeft: 3, signedInSeason: 1 }).yearsLeft).toBe(2);
  });

  it('non scende sotto zero', () => {
    expect(tickContract({ yearsLeft: 0, signedInSeason: 1 }).yearsLeft).toBe(0);
  });
});

describe('canLeave', () => {
  it("si può andare via nell'ultimo anno o a scadenza", () => {
    expect(canLeave({ yearsLeft: 0, signedInSeason: 1 })).toBe(true);
    expect(canLeave({ yearsLeft: 1, signedInSeason: 1 })).toBe(true);
  });

  it('a metà contratto si resta', () => {
    expect(canLeave({ yearsLeft: 3, signedInSeason: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/contract.test.ts`
Expected: FAIL — modulo `contract.js` non trovato.

- [ ] **Step 3: Implementare**

`src/engine/contract.ts`:

```ts
import type { Rng } from './rng.js';

export interface Contract {
  yearsLeft: number;
  signedInSeason: number;
}

/**
 * Durata del contratto: lunga per i giovani su cui si punta, corta per chi è a fine corsa.
 * Serve a dare attrito al mercato (decisione D-008): senza, si cambia squadra ogni estate.
 */
export function signContract(season: number, age: number, rng: Rng): Contract {
  const base = age <= 23 ? 4 : age <= 29 ? 3 : age <= 33 ? 2 : 1;
  const yearsLeft = Math.min(5, Math.max(1, base + rng.int(-1, 1)));
  return { yearsLeft, signedInSeason: season };
}

export function tickContract(contract: Contract): Contract {
  return { ...contract, yearsLeft: Math.max(0, contract.yearsLeft - 1) };
}

/** Si cambia squadra solo quando il contratto sta per finire. */
export function canLeave(contract: Contract): boolean {
  return contract.yearsLeft <= 1;
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/contract.test.ts`
Expected: 7 test passati.

- [ ] **Step 5: Commit**

```bash
git add src/engine/contract.ts tests/engine/contract.test.ts
git commit -m "feat: durata del contratto, attrito al mercato (chiude D-008)"
```

---

### Task 6: Il Rivale

Il sistema che dà una misura a tutta la carriera (spec §3.4).

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/rival.ts`
- Test: `tests/engine/rival.test.ts`

**Interfaces:**
- Consumes: `CareerPlayer`, `CandidateClub`, `simulateSeason`, `ambitiousPolicy`, `createPlayer`, `createRng`, `shouldRetire`
- Produces:
  - `RivalState` = `{ player: CareerPlayer; name: string; club: CandidateClub; seasons: SeasonRecord[]; qualified: boolean; capped: boolean; contract: Contract }`
  - `createRival(input: CreateRivalInput): RivalState`
  - `CreateRivalInput` = `{ playerRole: Role; playerAge: number; playerLeagueId: string; clubs: readonly CandidateClub[]; seed: number }`
  - `advanceRival(state: RivalState, clubs: readonly CandidateClub[], season: number, seed: number): RivalState`
  - `rivalSeed(careerSeed: number): number` — deriva il seed del Rivale

Il Rivale nasce **in un campionato diverso** da quello del giocatore, con lo stesso ruolo e la stessa età, e un potenziale confrontabile. Non prende mai decisioni umane: usa `ambitiousPolicy`.

- [ ] **Step 1: Aggiungere il tipo del confronto**

In `src/engine/types.ts`:

```ts
/** Come sta andando il Rivale, stagione per stagione (spec §3.4). */
export interface RivalSnapshot {
  name: string;
  clubName: string;
  overall: number;
  goals: number;
  assists: number;
  trophies: number;
  /** Vero se in questa stagione il Rivale ha fatto meglio. */
  aheadOfYou: boolean;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/rival.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { advanceRival, createRival, rivalSeed } from '../../src/engine/rival.js';
import type { CandidateClub } from '../../src/engine/market.js';
import type { Club, Role, WorldPlayer } from '../../src/world/types.js';

function club(id: string, name: string, league: string, level: number, overall: number): CandidateClub {
  const squad: WorldPlayer[] = Array.from({ length: 22 }, (_, index) => ({
    id: `${id}p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  const value: Club = { id, name, squad };
  return { club: value, leagueId: league, leagueName: league, leagueLevel: level };
}

const clubs: CandidateClub[] = [
  club('a1', 'Alfa', 'lega-italia', 1, 74),
  club('a2', 'Beta', 'lega-italia', 1, 70),
  club('b1', 'Gamma', 'lega-spagna', 1, 73),
  club('b2', 'Delta', 'lega-spagna', 1, 69),
];

const input = {
  playerRole: 'FWD' as Role, playerAge: 17, playerLeagueId: 'lega-italia', clubs, seed: 42,
};

describe('createRival', () => {
  it('nasce con lo stesso ruolo e la stessa età del giocatore', () => {
    const rival = createRival(input);
    expect(rival.player.role).toBe('FWD');
    expect(rival.player.age).toBe(17);
  });

  it('nasce in un campionato diverso dal tuo', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const rival = createRival({ ...input, seed });
      expect(rival.club.leagueId).not.toBe('lega-italia');
    }
  });

  it('ha un nome proprio', () => {
    const rival = createRival(input);
    expect(rival.name.length).toBeGreaterThan(2);
  });

  it('parte con un contratto e senza stagioni giocate', () => {
    const rival = createRival(input);
    expect(rival.seasons).toHaveLength(0);
    expect(rival.contract.yearsLeft).toBeGreaterThan(0);
  });

  it('è deterministico', () => {
    expect(createRival(input)).toEqual(createRival(input));
  });

  it('seed diversi generano rivali diversi', () => {
    const a = createRival({ ...input, seed: 1 });
    const b = createRival({ ...input, seed: 2 });
    expect(a.player.overall !== b.player.overall || a.club.club.id !== b.club.club.id).toBe(true);
  });
});

describe('advanceRival', () => {
  it('gioca una stagione e invecchia', () => {
    const rival = createRival(input);
    const next = advanceRival(rival, clubs, 1, 42);
    expect(next.seasons).toHaveLength(1);
    expect(next.player.age).toBe(rival.player.age + 1);
  });

  it('non muta lo stato che riceve', () => {
    const rival = createRival(input);
    advanceRival(rival, clubs, 1, 42);
    expect(rival.seasons).toHaveLength(0);
  });

  it('accumula stagioni una dopo l\'altra', () => {
    let rival = createRival(input);
    for (let season = 1; season <= 5; season += 1) {
      rival = advanceRival(rival, clubs, season, 42);
    }
    expect(rival.seasons).toHaveLength(5);
    expect(rival.seasons.map((s) => s.season)).toEqual([1, 2, 3, 4, 5]);
  });

  it('è deterministico', () => {
    const a = advanceRival(createRival(input), clubs, 1, 42);
    const b = advanceRival(createRival(input), clubs, 1, 42);
    expect(a).toEqual(b);
  });
});

describe('rivalSeed', () => {
  it('è diverso dal seed della carriera', () => {
    expect(rivalSeed(42)).not.toBe(42);
  });

  it('è stabile', () => {
    expect(rivalSeed(42)).toBe(rivalSeed(42));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/rival.test.ts`
Expected: FAIL — modulo `rival.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/rival.ts`:

```ts
import type { Role } from '../world/types.js';
import { clubStrength } from './clubStrength.js';
import { signContract, tickContract, type Contract } from './contract.js';
import { createPlayer } from './create.js';
import { ambitiousPolicy, type CandidateClub } from './market.js';
import { createRng } from './rng.js';
import { simulateSeason } from './season.js';
import type { CareerPlayer, SeasonRecord } from './types.js';

/** Nomi del Rivale: sono di fantasia, non appartengono a nessun calciatore reale. */
const RIVAL_NAMES: readonly string[] = [
  'Matteo Rinaldi', 'Luca Sartori', 'Andrea Bellini', 'Marco Fanti', 'Davide Corsi',
  'Samuel Adeyemi', 'Tomás Ferreira', 'Nikola Ivic', 'Youssef Haddad', 'Lucas Moreau',
];

export interface RivalState {
  name: string;
  player: CareerPlayer;
  club: CandidateClub;
  seasons: SeasonRecord[];
  qualified: boolean;
  capped: boolean;
  contract: Contract;
}

export interface CreateRivalInput {
  playerRole: Role;
  playerAge: number;
  playerLeagueId: string;
  clubs: readonly CandidateClub[];
  seed: number;
}

/**
 * Il Rivale ha un suo generatore casuale: così le sue vicende non consumano la sequenza
 * del giocatore, e la stessa carriera resta identica anche se un giorno il Rivale cambierà.
 */
export function rivalSeed(careerSeed: number): number {
  return (careerSeed ^ 0x9e3779b9) >>> 0;
}

export function createRival(input: CreateRivalInput): RivalState {
  const rng = createRng(rivalSeed(input.seed));

  // In un campionato diverso dal tuo: il confronto vale di più se non vi incrociate ogni domenica.
  const elsewhere = input.clubs.filter((entry) => entry.leagueId !== input.playerLeagueId);
  const pool = elsewhere.length > 0 ? elsewhere : input.clubs;
  const club = pool[rng.int(0, pool.length - 1)]!;

  const player = createPlayer(
    {
      name: RIVAL_NAMES[rng.int(0, RIVAL_NAMES.length - 1)]!,
      nationality: 'Italy',
      role: input.playerRole,
      age: input.playerAge,
      leagueLevel: club.leagueLevel,
    },
    rng,
  );

  return {
    name: player.name,
    player,
    club,
    seasons: [],
    qualified: false,
    capped: false,
    contract: signContract(0, input.playerAge, rng),
  };
}

/** Una stagione del Rivale, con le stesse regole del giocatore ma senza scelte umane. */
export function advanceRival(
  state: RivalState,
  clubs: readonly CandidateClub[],
  season: number,
  careerSeed: number,
): RivalState {
  const rng = createRng(rivalSeed(careerSeed) + season * 7919);

  const sameLeague = clubs.filter((entry) => entry.leagueId === state.club.leagueId);
  const leagueStrengths = (sameLeague.length > 0 ? sameLeague : clubs).map((entry) =>
    clubStrength(entry.club),
  );

  const others = clubs.filter((entry) => entry.club.id !== state.club.club.id);
  const candidates: CandidateClub[] = [];
  for (let i = 0; i < Math.min(8, others.length); i += 1) {
    const picked = others[rng.int(0, others.length - 1)];
    if (picked && !candidates.includes(picked)) candidates.push(picked);
  }

  const outcome = simulateSeason(
    {
      season,
      player: state.player,
      club: state.club.club,
      league: {
        id: state.club.leagueId,
        name: state.club.leagueName,
        level: state.club.leagueLevel,
        clubCount: leagueStrengths.length,
      },
      leagueStrengths,
      qualifiedToContinental: state.qualified,
      candidates,
      alreadyCapped: state.capped,
    },
    rng,
  );

  let club = state.club;
  let contract = tickContract(state.contract);
  if (contract.yearsLeft <= 1) {
    const chosen = ambitiousPolicy(outcome.record.offers, {
      currentMinutesShare: outcome.record.minutesShare,
      currentLeagueLevel: state.club.leagueLevel,
      age: outcome.grownPlayer.age,
    });
    const destination = chosen
      ? clubs.find((entry) => entry.club.id === chosen.clubId)
      : undefined;
    if (destination) {
      club = destination;
      contract = signContract(season, outcome.grownPlayer.age, rng);
    }
  }

  return {
    ...state,
    player: outcome.grownPlayer,
    club,
    contract,
    seasons: [...state.seasons, outcome.record],
    qualified: outcome.qualifiedNextSeason,
    capped: state.capped || outcome.record.national.capped,
  };
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/rival.test.ts`
Expected: 12 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/rival.ts tests/engine/rival.test.ts
git commit -m "feat: il Rivale, una seconda carriera simulata in parallelo"
```

---

### Task 7: Il confronto col Rivale e gli scontri diretti

**Files:**
- Modify: `src/engine/rival.ts`
- Test: `tests/engine/rivalCompare.test.ts`

**Interfaces:**
- Consumes: `SeasonRecord`, `RivalState`, `Rng`
- Produces:
  - `compareSeason(playerSeason: SeasonRecord, rivalSeason: SeasonRecord | undefined, rivalName: string, clubName: string): RivalSnapshot | null`
  - `seasonScoreOf(season: SeasonRecord): number` — il metro del confronto
  - `Showdown` = `{ season: number; competition: string; won: boolean }`
  - `rollShowdown(playerSeason: SeasonRecord, rivalSeason: SeasonRecord | undefined, rng: Rng): Showdown | null`

Uno scontro diretto capita quando **entrambi** hanno chiuso la stagione nei primi quattro del proprio campionato: si incrociano nella coppa continentale. Lo vince chi ha avuto la stagione migliore, con una componente di caso.

- [ ] **Step 1: Aggiungere il tipo**

In `src/engine/types.ts`:

```ts
/** Uno scontro diretto col Rivale: pesa il doppio nel punteggio finale (spec §3.4). */
export interface Showdown {
  season: number;
  competition: string;
  won: boolean;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/rivalCompare.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { compareSeason, rollShowdown, seasonScoreOf } from '../../src/engine/rival.js';
import { createRng } from '../../src/engine/rng.js';
import type { SeasonRecord } from '../../src/engine/types.js';

function season(over: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    season: 3, age: 22, clubId: 'c', clubName: 'Club', leagueId: 'lg', leagueName: 'Lega',
    leagueLevel: 1, minutesShare: 0.8, overallStart: 70, overallEnd: 72,
    stats: { appearances: 30, minutes: 2500, goals: 10, assists: 5, cleanSheets: 0, rating: 7 },
    position: 5, trophies: [], awards: [],
    national: { capped: false, caps: 0, goals: 0, tournament: null },
    valueEur: 5_000_000, offers: [],
    ...over,
  };
}

describe('seasonScoreOf', () => {
  it('premia gol, assist e voto', () => {
    const poor = seasonScoreOf(season({ stats: { appearances: 30, minutes: 2500, goals: 2, assists: 1, cleanSheets: 0, rating: 6.2 } }));
    const great = seasonScoreOf(season({ stats: { appearances: 30, minutes: 2500, goals: 20, assists: 10, cleanSheets: 0, rating: 7.9 } }));
    expect(great).toBeGreaterThan(poor);
  });

  it('premia i trofei', () => {
    const withTrophy = seasonScoreOf(season({
      trophies: [{ kind: 'league', season: 3, competitionName: 'Serie A' }],
    }));
    expect(withTrophy).toBeGreaterThan(seasonScoreOf(season()));
  });

  it('un portiere con molti clean sheet non è penalizzato', () => {
    const keeper = seasonScoreOf(season({
      stats: { appearances: 36, minutes: 3200, goals: 0, assists: 0, cleanSheets: 18, rating: 7.5 },
    }));
    expect(keeper).toBeGreaterThan(0);
  });
});

describe('compareSeason', () => {
  it('senza stagione del Rivale non produce confronto', () => {
    expect(compareSeason(season(), undefined, 'Tizio', 'Club')).toBeNull();
  });

  it('dice quando il Rivale è davanti', () => {
    const mine = season({ stats: { appearances: 30, minutes: 2500, goals: 3, assists: 1, cleanSheets: 0, rating: 6.3 } });
    const his = season({ stats: { appearances: 34, minutes: 3000, goals: 25, assists: 9, cleanSheets: 0, rating: 8 } });
    const snapshot = compareSeason(mine, his, 'Matteo Rinaldi', 'Real');
    expect(snapshot?.aheadOfYou).toBe(true);
    expect(snapshot?.name).toBe('Matteo Rinaldi');
    expect(snapshot?.goals).toBe(25);
  });

  it('dice quando sei davanti tu', () => {
    const mine = season({ stats: { appearances: 34, minutes: 3000, goals: 22, assists: 8, cleanSheets: 0, rating: 7.9 } });
    const his = season({ stats: { appearances: 20, minutes: 1200, goals: 2, assists: 1, cleanSheets: 0, rating: 6.2 } });
    expect(compareSeason(mine, his, 'Tizio', 'Club')?.aheadOfYou).toBe(false);
  });
});

describe('rollShowdown', () => {
  const top = season({ position: 2 });
  const mid = season({ position: 11 });

  it('niente scontro se uno dei due non è arrivato in alto', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      expect(rollShowdown(mid, top, createRng(seed))).toBeNull();
      expect(rollShowdown(top, mid, createRng(seed))).toBeNull();
    }
  });

  it('senza Rivale non c\'è scontro', () => {
    expect(rollShowdown(top, undefined, createRng(1))).toBeNull();
  });

  it('quando entrambi sono in alto lo scontro può capitare', () => {
    let met = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      if (rollShowdown(top, top, createRng(seed))) met += 1;
    }
    expect(met).toBeGreaterThan(20);
    expect(met).toBeLessThan(180);
  });

  it('chi ha fatto la stagione migliore vince più spesso', () => {
    const strong = season({ position: 1, stats: { appearances: 36, minutes: 3200, goals: 28, assists: 10, cleanSheets: 0, rating: 8.4 } });
    const weak = season({ position: 4, stats: { appearances: 30, minutes: 2400, goals: 4, assists: 2, cleanSheets: 0, rating: 6.4 } });
    let wins = 0;
    let total = 0;
    for (let seed = 0; seed < 500; seed += 1) {
      const showdown = rollShowdown(strong, weak, createRng(seed));
      if (showdown) { total += 1; if (showdown.won) wins += 1; }
    }
    expect(total).toBeGreaterThan(0);
    expect(wins / total).toBeGreaterThan(0.6);
  });

  it('è deterministico', () => {
    expect(rollShowdown(top, top, createRng(5))).toEqual(rollShowdown(top, top, createRng(5)));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/rivalCompare.test.ts`
Expected: FAIL — funzioni non esportate.

- [ ] **Step 4: Implementare in `src/engine/rival.ts`**

Prima estendere gli import già presenti **in cima al file** (gli import stanno a inizio modulo, non in fondo):

```ts
import type { Rng } from './rng.js';
import type { CareerPlayer, RivalSnapshot, SeasonRecord, Showdown } from './types.js';
```

Poi aggiungere in fondo al file:

```ts
/** Il metro con cui si misurano due stagioni: vale per tutti i ruoli. */
export function seasonScoreOf(season: SeasonRecord): number {
  const stats = season.stats;
  const production = stats.goals * 2 + stats.assists + stats.cleanSheets * 1.5;
  const quality = (stats.rating - 6) * 8;
  const silverware = season.trophies.length * 12 + season.awards.length * 18;
  return production + quality + silverware + stats.appearances * 0.2;
}

export function compareSeason(
  playerSeason: SeasonRecord,
  rivalSeason: SeasonRecord | undefined,
  rivalName: string,
  rivalClubName: string,
): RivalSnapshot | null {
  if (!rivalSeason) return null;
  return {
    name: rivalName,
    clubName: rivalClubName,
    overall: rivalSeason.overallEnd,
    goals: rivalSeason.stats.goals,
    assists: rivalSeason.stats.assists,
    trophies: rivalSeason.trophies.length,
    aheadOfYou: seasonScoreOf(rivalSeason) > seasonScoreOf(playerSeason),
  };
}

const SHOWDOWN_POSITION = 4;

/**
 * Quando entrambi arrivano in alto, prima o poi vi incrociate in coppa.
 * Quelle partite pesano il doppio nel punteggio finale (spec §3.4).
 */
export function rollShowdown(
  playerSeason: SeasonRecord,
  rivalSeason: SeasonRecord | undefined,
  rng: Rng,
): Showdown | null {
  if (!rivalSeason) return null;
  if (playerSeason.position > SHOWDOWN_POSITION || rivalSeason.position > SHOWDOWN_POSITION) {
    return null;
  }
  if (!rng.chance(0.45)) return null;

  const mine = seasonScoreOf(playerSeason);
  const his = seasonScoreOf(rivalSeason);
  const edge = (mine - his) / Math.max(20, mine + his);
  return {
    season: playerSeason.season,
    competition: 'Coppa Continentale',
    won: rng.chance(Math.min(0.85, Math.max(0.15, 0.5 + edge))),
  };
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/rivalCompare.test.ts`
Expected: 11 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/rival.ts src/engine/types.ts tests/engine/rivalCompare.test.ts
git commit -m "feat: confronto stagionale col Rivale e scontri diretti in coppa"
```

---

### Task 8: Il punteggio GOAT

Il verdetto che chiude la carriera (spec §3.7): sette componenti come il concorrente, più due che loro non hanno.

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/goatScore.ts`
- Test: `tests/engine/goatScore.test.ts`

**Interfaces:**
- Consumes: `CareerResult`, `Role`
- Produces:
  - `GoatScore` = `{ total: number; components: Record<GoatComponent, number> }`
  - `GoatComponent` = `'performance' | 'trophies' | 'awards' | 'national' | 'peakOverall' | 'peakValue' | 'longevity' | 'rival' | 'difficulty'`
  - `computeGoatScore(input: GoatInput): GoatScore`
  - `GoatInput` = `{ role: Role; seasons: readonly SeasonRecord[]; trophies: readonly Trophy[]; awards: readonly Award[]; peakOverall: number; peakValueEur: number; totalCaps: number; startingLeagueLevel: number; showdowns: readonly Showdown[]; seasonsAheadOfRival: number }`

Ogni componente vale da 0 a 100; il totale è la somma pesata riportata su **0-1000**. La normalizzazione per ruolo agisce sulla sola componente `performance`: gol e assist per gli altri, clean sheet e voto per i portieri.

Pesi: performance 20%, trophies 15%, awards 12%, national 10%, peakOverall 12%, peakValue 8%, longevity 8%, rival 10%, difficulty 5%.

- [ ] **Step 1: Aggiungere i tipi**

In `src/engine/types.ts`:

```ts
export type GoatComponent =
  | 'performance' | 'trophies' | 'awards' | 'national'
  | 'peakOverall' | 'peakValue' | 'longevity' | 'rival' | 'difficulty';

/** Il verdetto finale: un numero da 0 a 1000 e le voci che lo compongono. */
export interface GoatScore {
  total: number;
  components: Record<GoatComponent, number>;
}
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/goatScore.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeGoatScore, type GoatInput } from '../../src/engine/goatScore.js';
import type { SeasonRecord } from '../../src/engine/types.js';

function season(goals: number, rating = 7, cleanSheets = 0): SeasonRecord {
  return {
    season: 1, age: 24, clubId: 'c', clubName: 'Club', leagueId: 'lg', leagueName: 'Lega',
    leagueLevel: 1, minutesShare: 0.8, overallStart: 75, overallEnd: 76,
    stats: { appearances: 32, minutes: 2800, goals, assists: 5, cleanSheets, rating },
    position: 4, trophies: [], awards: [],
    national: { capped: true, caps: 6, goals: 2, tournament: null },
    valueEur: 20_000_000, offers: [],
  };
}

const modest: GoatInput = {
  role: 'FWD',
  seasons: Array.from({ length: 12 }, () => season(6, 6.5)),
  trophies: [], awards: [], peakOverall: 68, peakValueEur: 3_000_000,
  totalCaps: 0, startingLeagueLevel: 1, showdowns: [], seasonsAheadOfRival: 3,
};

const legend: GoatInput = {
  role: 'FWD',
  seasons: Array.from({ length: 18 }, () => season(24, 8)),
  trophies: Array.from({ length: 12 }, (_, i) => ({
    kind: 'league' as const, season: i, competitionName: 'Serie A',
  })),
  awards: Array.from({ length: 5 }, (_, i) => ({
    kind: 'topScorer' as const, season: i, competitionName: 'Serie A',
  })),
  peakOverall: 92, peakValueEur: 150_000_000, totalCaps: 110,
  startingLeagueLevel: 1, showdowns: [{ season: 8, competition: 'Coppa', won: true }],
  seasonsAheadOfRival: 15,
};

describe('computeGoatScore', () => {
  it('una leggenda sta molto sopra un onesto professionista', () => {
    expect(computeGoatScore(legend).total).toBeGreaterThan(computeGoatScore(modest).total * 2);
  });

  it('il totale resta fra 0 e 1000', () => {
    for (const input of [modest, legend]) {
      const score = computeGoatScore(input);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(1000);
    }
  });

  it('ogni componente resta fra 0 e 100', () => {
    for (const value of Object.values(computeGoatScore(legend).components)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('un portiere non è penalizzato dai gol che non fa', () => {
    const keeperSeasons = Array.from({ length: 18 }, () => season(0, 8, 18));
    const keeper = computeGoatScore({ ...legend, role: 'GK', seasons: keeperSeasons });
    const striker = computeGoatScore(legend);
    expect(keeper.components.performance).toBeGreaterThan(striker.components.performance * 0.7);
  });

  it('partire dalla quarta divisione vale più che partire dalla prima', () => {
    const fromBottom = computeGoatScore({ ...legend, startingLeagueLevel: 4 });
    const fromTop = computeGoatScore({ ...legend, startingLeagueLevel: 1 });
    expect(fromBottom.total).toBeGreaterThan(fromTop.total);
  });

  it('battere il Rivale conta', () => {
    const ahead = computeGoatScore({ ...legend, seasonsAheadOfRival: 18 });
    const behind = computeGoatScore({ ...legend, seasonsAheadOfRival: 0 });
    expect(ahead.total).toBeGreaterThan(behind.total);
  });

  it('vincere gli scontri diretti conta', () => {
    const won = computeGoatScore({
      ...legend, showdowns: [{ season: 5, competition: 'Coppa', won: true }],
    });
    const lost = computeGoatScore({
      ...legend, showdowns: [{ season: 5, competition: 'Coppa', won: false }],
    });
    expect(won.components.rival).toBeGreaterThan(lost.components.rival);
  });

  it('una carriera vuota non produce errori né punteggi negativi', () => {
    const empty = computeGoatScore({
      role: 'MID', seasons: [], trophies: [], awards: [], peakOverall: 0,
      peakValueEur: 0, totalCaps: 0, startingLeagueLevel: 1, showdowns: [],
      seasonsAheadOfRival: 0,
    });
    expect(empty.total).toBeGreaterThanOrEqual(0);
  });

  it('è deterministico: nessuna casualità nel verdetto', () => {
    expect(computeGoatScore(legend)).toEqual(computeGoatScore(legend));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/goatScore.test.ts`
Expected: FAIL — modulo `goatScore.js` non trovato.

- [ ] **Step 4: Implementare**

`src/engine/goatScore.ts`:

```ts
import type { Role } from '../world/types.js';
import type {
  Award, GoatComponent, GoatScore, SeasonRecord, Showdown, Trophy,
} from './types.js';

export interface GoatInput {
  role: Role;
  seasons: readonly SeasonRecord[];
  trophies: readonly Trophy[];
  awards: readonly Award[];
  peakOverall: number;
  peakValueEur: number;
  totalCaps: number;
  /** Livello del campionato in cui è cominciata la carriera: partire in basso vale di più. */
  startingLeagueLevel: number;
  showdowns: readonly Showdown[];
  seasonsAheadOfRival: number;
}

const WEIGHTS: Record<GoatComponent, number> = {
  performance: 0.2,
  trophies: 0.15,
  awards: 0.12,
  national: 0.1,
  peakOverall: 0.12,
  peakValue: 0.08,
  longevity: 0.08,
  rival: 0.1,
  difficulty: 0.05,
};

/** Porta un valore grezzo su una scala 0-100, saturando dolcemente verso l'alto. */
function scale(value: number, reference: number): number {
  if (value <= 0) return 0;
  return Math.min(100, (value / (value + reference)) * 200);
}

/**
 * Il rendimento è l'unica voce normalizzata per ruolo: a un portiere si chiedono
 * clean sheet e parate, a un attaccante gol (spec §3.7).
 */
function performanceOf(role: Role, seasons: readonly SeasonRecord[]): number {
  if (seasons.length === 0) return 0;
  const totals = seasons.reduce(
    (sum, season) => ({
      goals: sum.goals + season.stats.goals,
      assists: sum.assists + season.stats.assists,
      cleanSheets: sum.cleanSheets + season.stats.cleanSheets,
      appearances: sum.appearances + season.stats.appearances,
      rating: sum.rating + season.stats.rating * season.stats.appearances,
    }),
    { goals: 0, assists: 0, cleanSheets: 0, appearances: 0, rating: 0 },
  );

  const averageRating = totals.appearances > 0 ? totals.rating / totals.appearances : 0;
  const volume = scale(totals.appearances, 300);

  const production =
    role === 'GK'
      ? scale(totals.cleanSheets * 4, 250)
      : role === 'DEF'
        ? scale(totals.goals * 6 + totals.assists * 4 + totals.cleanSheets * 3, 300)
        : role === 'MID'
          ? scale(totals.goals * 3 + totals.assists * 3, 300)
          : scale(totals.goals * 2 + totals.assists * 1.5, 300);

  const quality = Math.min(100, Math.max(0, (averageRating - 5.8) * 45));
  return Math.min(100, production * 0.5 + volume * 0.2 + quality * 0.3);
}

export function computeGoatScore(input: GoatInput): GoatScore {
  const trophyWeight = input.trophies.reduce(
    (sum, trophy) =>
      sum + (trophy.kind === 'continental' ? 3 : trophy.kind === 'league' ? 2 : 1),
    0,
  );
  const showdownScore = input.showdowns.reduce(
    (sum, showdown) => sum + (showdown.won ? 12 : -4),
    0,
  );
  const seasonCount = Math.max(1, input.seasons.length);

  const components: Record<GoatComponent, number> = {
    performance: performanceOf(input.role, input.seasons),
    trophies: scale(trophyWeight, 12),
    awards: scale(input.awards.length * 3, 12),
    national: scale(input.totalCaps, 60),
    peakOverall: Math.min(100, Math.max(0, (input.peakOverall - 55) * 2.6)),
    peakValue: scale(input.peakValueEur / 1_000_000, 60),
    longevity: scale(input.seasons.length, 14),
    rival: Math.min(
      100,
      Math.max(0, (input.seasonsAheadOfRival / seasonCount) * 80 + showdownScore),
    ),
    difficulty: Math.min(100, (input.startingLeagueLevel - 1) * 30),
  };

  const total = Math.round(
    (Object.keys(WEIGHTS) as GoatComponent[]).reduce(
      (sum, key) => sum + components[key] * WEIGHTS[key],
      0,
    ) * 10,
  );

  return { total: Math.min(1000, Math.max(0, total)), components };
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/engine/goatScore.test.ts`
Expected: 9 test passati.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/goatScore.ts tests/engine/goatScore.test.ts
git commit -m "feat: punteggio GOAT normalizzato per ruolo, con Rivale e difficolta"
```

---

### Task 9: I bivi e gli infortuni dentro la stagione

**Files:**
- Modify: `src/engine/season.ts`, `src/engine/types.ts`
- Test: `tests/engine/seasonDilemmas.test.ts`

**Interfaces:**
- Consumes: tutti i moduli dei Task 1-5
- Produces: `SimulateSeasonInput` guadagna `marks`, `contractYearsLeft`, `minutesBonus`, `dilemmaPolicy`; `SeasonOutcome` guadagna `marks`, `choices`, `injury`, `retirementDelta`; `SeasonRecord` guadagna `injury`, `choices`, `marks`

L'ordine dentro la stagione conta e va rispettato: minuti (con i modificatori dei Segni e i bonus delle scelte passate) → infortunio → statistiche ridotte dall'infortunio → classifica → trofei e premi → nazionale → **bivi** (che vedono l'infortunio appena successo) → crescita → valore → offerte → invecchiamento dei Segni.

- [ ] **Step 1: Aggiornare i tipi**

In `src/engine/types.ts`, aggiungere a `SeasonRecord`:

```ts
  injury: Injury | null;
  choices: DilemmaChoice[];
  /** I Segni attivi a fine stagione. */
  marks: Mark[];
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/seasonDilemmas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { boldPolicy } from '../../src/engine/dilemmas.js';
import { createPlayer } from '../../src/engine/create.js';
import { addMark } from '../../src/engine/marks.js';
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

function input(over: Partial<SimulateSeasonInput> = {}): SimulateSeasonInput {
  return {
    season: 3,
    player: createPlayer(
      { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 24, leagueLevel: 1 },
      createRng(1),
    ),
    club: home,
    league: { id: 'lg', name: 'Lega', level: 1, clubCount: 20 },
    leagueStrengths: [78, 76, 74, 72, 70, 68, 66, 64],
    qualifiedToContinental: false,
    candidates: [],
    alreadyCapped: false,
    marks: [],
    contractYearsLeft: 2,
    minutesBonus: 0,
    dilemmaPolicy: boldPolicy,
    ...over,
  };
}

describe('la stagione con bivi e infortuni', () => {
  it('la riga di stagione riporta scelte, infortunio e Segni', () => {
    const { record } = simulateSeason(input(), createRng(1));
    expect(Array.isArray(record.choices)).toBe(true);
    expect(Array.isArray(record.marks)).toBe(true);
    expect(record.injury === null || typeof record.injury.matchesOut === 'number').toBe(true);
  });

  it('ogni scelta registra il bivio, la strada presa e come è andata', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const { record } = simulateSeason(input(), createRng(seed));
      for (const choice of record.choices) {
        expect(choice.dilemmaId.length).toBeGreaterThan(0);
        expect(choice.optionId.length).toBeGreaterThan(0);
        expect(choice.outcomeText.length).toBeGreaterThan(0);
        expect(choice.season).toBe(3);
      }
    }
  });

  it('un infortunio grave toglie minuti e statistiche', () => {
    let hurtMinutes = 0;
    let healthyMinutes = 0;
    let hurtCount = 0;
    let healthyCount = 0;
    for (let seed = 0; seed < 300; seed += 1) {
      const { record } = simulateSeason(input(), createRng(seed));
      if (record.injury && record.injury.severity !== 'lieve') {
        hurtMinutes += record.stats.minutes; hurtCount += 1;
      } else if (!record.injury) {
        healthyMinutes += record.stats.minutes; healthyCount += 1;
      }
    }
    expect(hurtCount).toBeGreaterThan(0);
    expect(hurtMinutes / hurtCount).toBeLessThan(healthyMinutes / healthyCount);
  });

  it('litigare col mister toglie minuti già in questa stagione', () => {
    const angry = { ...input(), marks: addMark([], 'rissa-col-mister', 1, 1) };
    let withMark = 0;
    let without = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      withMark += simulateSeason(angry, createRng(seed)).record.minutesShare;
      without += simulateSeason(input(), createRng(seed)).record.minutesShare;
    }
    expect(withMark).toBeLessThan(without);
  });

  it('i Segni restituiti sono già invecchiati di una stagione', () => {
    const withMark = { ...input(), marks: addMark([], 'uomo-spogliatoio', 0.8, 1) };
    const { record } = simulateSeason(withMark, createRng(1));
    const aged = record.marks.find((mark) => mark.id === 'uomo-spogliatoio');
    if (aged) expect(aged.intensity).toBeLessThan(0.8);
  });

  it('è deterministico anche con bivi e infortuni', () => {
    expect(simulateSeason(input(), createRng(9))).toEqual(simulateSeason(input(), createRng(9)));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/seasonDilemmas.test.ts`
Expected: FAIL — `SimulateSeasonInput` non accetta `marks`.

- [ ] **Step 4: Modificare `src/engine/season.ts`**

Aggiungere gli import:

```ts
import type { DilemmaContext } from './dilemmaCatalog.js';
import { applyEffects, pickDilemmas, resolveOption, type DilemmaPolicy, type DilemmaState } from './dilemmas.js';
import { injuryMinutesPenalty, rollInjury } from './injuries.js';
import { ageMarks, minutesModifier } from './marks.js';
import type { DilemmaChoice, Injury, Mark } from './types.js';
```

Estendere `SimulateSeasonInput` con:

```ts
  marks: readonly Mark[];
  contractYearsLeft: number;
  /** Minuti guadagnati o persi per effetto delle scelte della stagione precedente. */
  minutesBonus: number;
  dilemmaPolicy: DilemmaPolicy;
```

Estendere `SeasonOutcome` con:

```ts
  marks: Mark[];
  retirementDelta: number;
  /** Bonus minuti da applicare alla stagione successiva. */
  minutesBonusNext: number;
```

Sostituire il corpo della funzione, mantenendo l'ordine descritto sopra:

```ts
export function simulateSeason(input: SimulateSeasonInput, rng: Rng): SeasonOutcome {
  const { player, club, league } = input;

  const baseShare = playingTimeShare(
    { overall: player.overall, age: player.age, role: player.role },
    club.squad,
  );
  // I Segni e le scelte passate spostano i minuti prima ancora che la stagione cominci.
  const adjustedShare = Math.min(
    0.95,
    Math.max(0.02, baseShare + minutesModifier(input.marks) + input.minutesBonus),
  );

  const injury = rollInjury(
    {
      season: input.season,
      age: player.age,
      physique: player.physique,
      minutesShare: adjustedShare,
      marks: input.marks,
    },
    rng,
  );
  const minutesShare = Math.max(0.02, adjustedShare * (1 - injuryMinutesPenalty(injury)));

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
      season: input.season, leagueName: league.name, position,
      clubCount: league.clubCount, qualifiedToContinental: input.qualifiedToContinental,
      minutesShare,
    },
    rng,
  );

  const awards = resolveAwards(
    {
      season: input.season, leagueName: league.name, leagueLevel: league.level,
      age: player.age, role: player.role, stats, position,
    },
    rng,
  );

  const national = nationalSeason(
    {
      season: input.season, age: player.age, overall: player.overall, role: player.role,
      stats, leagueLevel: league.level, alreadyCapped: input.alreadyCapped,
    },
    rng,
  );

  // I bivi vedono la stagione appena vissuta, infortunio compreso.
  const context: DilemmaContext = {
    season: input.season,
    age: player.age,
    overall: player.overall,
    minutesShare,
    injury,
    marks: input.marks,
    clubName: club.name,
    leagueLevel: league.level,
    contractYearsLeft: input.contractYearsLeft,
    wonSomething: trophies.length > 0,
  };

  let state: DilemmaState = {
    overall: player.overall,
    marks: [...input.marks],
    minutesDelta: 0,
    retirementDelta: 0,
    valueMultiplier: 1,
  };
  const choices: DilemmaChoice[] = [];

  for (const dilemma of pickDilemmas(context, rng)) {
    const option = input.dilemmaPolicy(dilemma, context);
    const outcome = resolveOption(option, rng);
    state = applyEffects(state, outcome.effects, input.season);
    choices.push({
      dilemmaId: dilemma.id,
      optionId: option.id,
      optionLabel: option.label,
      outcomeText: outcome.text,
      season: input.season,
    });
  }

  const afterChoices: CareerPlayer = {
    ...player,
    overall: Math.min(99, Math.max(1, state.overall)),
  };
  const grownPlayer = growPlayer(afterChoices, minutesShare, rng);
  const valueEur = Math.round(
    marketValue(grownPlayer.overall, grownPlayer.age, grownPlayer.potential) *
      state.valueMultiplier,
  );

  const offers = generateOffers(
    {
      player: {
        overall: grownPlayer.overall, age: grownPlayer.age,
        potential: grownPlayer.potential, role: grownPlayer.role,
      },
      currentClubId: club.id,
      currentMinutesShare: minutesShare,
      stats,
      candidates: input.candidates,
    },
    rng,
  );

  const marks = ageMarks(state.marks);

  return {
    record: {
      season: input.season, age: player.age, clubId: club.id, clubName: club.name,
      leagueId: league.id, leagueName: league.name, leagueLevel: league.level,
      minutesShare, overallStart: player.overall, overallEnd: grownPlayer.overall,
      stats, position, trophies, awards, national, valueEur, offers,
      injury, choices, marks,
    },
    grownPlayer,
    qualifiedNextSeason: position <= CONTINENTAL_SPOTS,
    marks,
    retirementDelta: state.retirementDelta,
    minutesBonusNext: state.minutesDelta,
  };
}
```

- [ ] **Step 5: Propagare la nuova firma al Rivale**

`advanceRival` (Task 6) chiama `simulateSeason` e smette di compilare, perché ora servono
quattro campi in più. Il Rivale non prende decisioni umane: usa la politica automatica e
non porta Segni propri. In `src/engine/rival.ts`, dentro la chiamata a `simulateSeason`,
aggiungere:

```ts
      marks: [],
      contractYearsLeft: state.contract.yearsLeft,
      minutesBonus: 0,
      dilemmaPolicy: boldPolicy,
```

e in cima al file:

```ts
import { boldPolicy } from './dilemmas.js';
```

- [ ] **Step 6: Aggiornare gli helper dei test che costruiscono un `SeasonRecord`**

`SeasonRecord` ha tre campi nuovi, quindi ogni test che ne fabbrica uno a mano non compila
più. Sono **tre** file, scritti nei task precedenti di questa stessa fase:

- `tests/engine/season.test.ts` — all'helper `input()`, prima di `...over`, aggiungere:

```ts
    marks: [],
    contractYearsLeft: 2,
    minutesBonus: 0,
    dilemmaPolicy: boldPolicy,
```

con, in cima al file, `import { boldPolicy } from '../../src/engine/dilemmas.js';`

- `tests/engine/rivalCompare.test.ts` — all'helper `season()`, prima di `...over`, aggiungere:

```ts
    injury: null,
    choices: [],
    marks: [],
```

- `tests/engine/goatScore.test.ts` — nella funzione `season()`, dopo `offers: []`, aggiungere:

```ts
    injury: null,
    choices: [],
    marks: [],
```

- [ ] **Step 7: Eseguire tutti i test del motore**

Run: `npx vitest run tests/engine/`
Expected: tutti verdi. Se restano errori di tipo, sono altri helper che costruiscono
`SeasonRecord` a mano: il compilatore li elenca tutti con `npm run typecheck`.

- [ ] **Step 8: Commit**

```bash
git add src/engine/season.ts src/engine/rival.ts src/engine/types.ts tests/engine/
git commit -m "feat: infortuni, bivi e Segni dentro la stagione"
```

---

### Task 10: La carriera completa

**Files:**
- Modify: `src/engine/career.ts`, `src/engine/types.ts`
- Test: `tests/engine/careerFull.test.ts`

**Interfaces:**
- Produces: `RunCareerInput` guadagna `dilemmaPolicy?`; `CareerResult` guadagna `goat`, `rival`, `showdowns`, `choices`, `marks`, `injuries`

- [ ] **Step 1: Aggiornare `CareerResult`**

In `src/engine/types.ts`:

```ts
  /** Il verdetto finale (spec §3.7). */
  goat: GoatScore;
  /** Come è andata al Rivale, stagione per stagione. */
  rival: { name: string; clubName: string; peakOverall: number; trophies: number; goals: number };
  showdowns: Showdown[];
  choices: DilemmaChoice[];
  marks: Mark[];
  injuries: Injury[];
  /** In quante stagioni hai fatto meglio del Rivale. */
  seasonsAheadOfRival: number;
```

- [ ] **Step 2: Scrivere i test che falliscono**

`tests/engine/careerFull.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { runCareer } from '../../src/engine/career.js';
import type { CandidateClub } from '../../src/engine/market.js';
import { createFileWorldSource } from '../../src/world/fileSource.js';

describe('la carriera completa', () => {
  let clubs: CandidateClub[];
  let startId: string;

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const leagues = await source.listLeagues();
    clubs = [];
    for (const league of leagues.slice(0, 6)) {
      const bundle = await source.loadLeague(league.id);
      for (const club of bundle.clubs) {
        clubs.push({ club, leagueId: league.id, leagueName: league.name, leagueLevel: league.level });
      }
    }
    startId = clubs[0]!.club.id;
  });

  function career(seed: number) {
    return runCareer({
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
      world: { clubs, startClubId: startId },
      seed,
    });
  }

  it('produce un punteggio GOAT sensato', () => {
    const result = career(1);
    expect(result.goat.total).toBeGreaterThan(0);
    expect(result.goat.total).toBeLessThanOrEqual(1000);
    expect(Object.keys(result.goat.components)).toHaveLength(9);
  });

  it('il Rivale ha vissuto la sua carriera in parallelo', () => {
    const result = career(2);
    expect(result.rival.name.length).toBeGreaterThan(2);
    expect(result.rival.peakOverall).toBeGreaterThan(40);
    expect(result.seasonsAheadOfRival).toBeGreaterThanOrEqual(0);
    expect(result.seasonsAheadOfRival).toBeLessThanOrEqual(result.seasons.length);
  });

  it('lungo la carriera si prendono decisioni', () => {
    const result = career(3);
    expect(result.choices.length).toBeGreaterThan(3);
  });

  it('le scelte lasciano Segni', () => {
    let withMarks = 0;
    for (let seed = 0; seed < 30; seed += 1) {
      if (career(seed).seasons.some((season) => season.marks.length > 0)) withMarks += 1;
    }
    expect(withMarks).toBeGreaterThan(20);
  });

  it('qualcuno si fa male, durante una carriera intera', () => {
    let withInjuries = 0;
    for (let seed = 0; seed < 30; seed += 1) {
      if (career(seed).injuries.length > 0) withInjuries += 1;
    }
    expect(withInjuries).toBeGreaterThan(20);
  });

  it('il contratto frena il mercato: non si cambia squadra ogni anno', () => {
    let total = 0;
    for (let seed = 0; seed < 30; seed += 1) total += career(seed).clubsPlayed.length;
    expect(total / 30).toBeLessThan(7);
  });

  it('è deterministica, Rivale compreso', () => {
    expect(JSON.stringify(career(77))).toBe(JSON.stringify(career(77)));
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/engine/careerFull.test.ts`
Expected: FAIL — `goat` non esiste su `CareerResult`.

- [ ] **Step 4: Riscrivere `src/engine/career.ts`**

```ts
import { clubStrength } from './clubStrength.js';
import { canLeave, signContract, tickContract } from './contract.js';
import { createPlayer, type CreatePlayerInput } from './create.js';
import { boldPolicy, type DilemmaPolicy } from './dilemmas.js';
import { computeGoatScore } from './goatScore.js';
import { ambitiousPolicy, type CandidateClub, type TransferPolicy } from './market.js';
import { advanceRival, compareSeason, createRival, rollShowdown } from './rival.js';
import { shouldRetire } from './retirement.js';
import { createRng } from './rng.js';
import { simulateSeason } from './season.js';
import type {
  Award, CareerResult, DilemmaChoice, Injury, Mark, SeasonRecord, Showdown, Trophy,
} from './types.js';

export interface CareerWorld {
  clubs: readonly CandidateClub[];
  startClubId: string;
}

export interface RunCareerInput {
  create: CreatePlayerInput;
  world: CareerWorld;
  seed: number;
  policy?: TransferPolicy;
  /** In Fase 4 sarà l'utente a scegliere ai bivi. */
  dilemmaPolicy?: DilemmaPolicy;
}

const MAX_SEASONS = 30;
const CANDIDATE_SAMPLE = 12;

export function runCareer(input: RunCareerInput): CareerResult {
  const rng = createRng(input.seed);
  const policy = input.policy ?? ambitiousPolicy;
  const dilemmaPolicy = input.dilemmaPolicy ?? boldPolicy;

  let current = input.world.clubs.find((entry) => entry.club.id === input.world.startClubId);
  if (!current) throw new Error(`club di partenza non trovato: ${input.world.startClubId}`);

  const startingLeagueLevel = current.leagueLevel;
  let player = createPlayer(input.create, rng);
  let contract = signContract(0, player.age, rng);

  let rival = createRival({
    playerRole: player.role,
    playerAge: player.age,
    playerLeagueId: current.leagueId,
    clubs: input.world.clubs,
    seed: input.seed,
  });

  const seasons: SeasonRecord[] = [];
  const clubsPlayed: string[] = [current.club.name];
  const showdowns: Showdown[] = [];
  let marks: Mark[] = [];
  let minutesBonus = 0;
  let retirementDelta = 0;
  let qualified = false;
  let capped = false;
  let seasonsAheadOfRival = 0;

  const strengthsByLeague = new Map<string, number[]>();
  for (const entry of input.world.clubs) {
    const list = strengthsByLeague.get(entry.leagueId) ?? [];
    list.push(clubStrength(entry.club));
    strengthsByLeague.set(entry.leagueId, list);
  }

  while (!player.retired && seasons.length < MAX_SEASONS) {
    const club = current;
    const season = seasons.length + 1;
    const leagueStrengths = strengthsByLeague.get(club.leagueId) ?? [clubStrength(club.club)];

    const others = input.world.clubs.filter((entry) => entry.club.id !== club.club.id);
    const candidates: CandidateClub[] = [];
    for (let i = 0; i < Math.min(CANDIDATE_SAMPLE, others.length); i += 1) {
      const picked = others[rng.int(0, others.length - 1)];
      if (picked && !candidates.includes(picked)) candidates.push(picked);
    }

    const outcome = simulateSeason(
      {
        season,
        player,
        club: club.club,
        league: {
          id: club.leagueId, name: club.leagueName,
          level: club.leagueLevel, clubCount: leagueStrengths.length,
        },
        leagueStrengths,
        qualifiedToContinental: qualified,
        candidates,
        alreadyCapped: capped,
        marks,
        contractYearsLeft: contract.yearsLeft,
        minutesBonus,
        dilemmaPolicy,
      },
      rng,
    );

    // Il Rivale vive la sua stagione con il proprio generatore casuale.
    rival = advanceRival(rival, input.world.clubs, season, input.seed);
    const rivalSeason = rival.seasons[rival.seasons.length - 1];
    const snapshot = compareSeason(outcome.record, rivalSeason, rival.name, rival.club.club.name);
    if (snapshot && !snapshot.aheadOfYou) seasonsAheadOfRival += 1;
    const showdown = rollShowdown(outcome.record, rivalSeason, rng);
    if (showdown) showdowns.push(showdown);

    seasons.push(outcome.record);
    qualified = outcome.qualifiedNextSeason;
    capped = capped || outcome.record.national.capped;
    marks = outcome.marks;
    minutesBonus = outcome.minutesBonusNext;
    retirementDelta += outcome.retirementDelta;
    player = outcome.grownPlayer;
    contract = tickContract(contract);

    // Gli anni bruciati dalle scelte accorciano la carriera.
    const forcedRetirement = retirementDelta < 0 && player.age >= 34 + retirementDelta;
    if (forcedRetirement || shouldRetire(player, outcome.record.minutesShare, rng)) {
      player = { ...player, retired: true };
      break;
    }

    if (canLeave(contract)) {
      const chosen = policy(outcome.record.offers, {
        currentMinutesShare: outcome.record.minutesShare,
        currentLeagueLevel: club.leagueLevel,
        age: player.age,
      });
      if (chosen) {
        const destination = input.world.clubs.find((entry) => entry.club.id === chosen.clubId);
        if (destination) {
          current = destination;
          contract = signContract(season, player.age, rng);
          if (clubsPlayed[clubsPlayed.length - 1] !== destination.club.name) {
            clubsPlayed.push(destination.club.name);
          }
        }
      }
    }
  }

  if (!player.retired) player = { ...player, retired: true };

  const trophies: Trophy[] = seasons.flatMap((season) => season.trophies);
  const awards: Award[] = seasons.flatMap((season) => season.awards);
  const choices: DilemmaChoice[] = seasons.flatMap((season) => season.choices);
  const injuries: Injury[] = seasons
    .map((season) => season.injury)
    .filter((injury): injury is Injury => injury !== null);

  const peakOverall = seasons.reduce((peak, season) => Math.max(peak, season.overallEnd), 0);
  const peakValueEur = seasons.reduce((peak, season) => Math.max(peak, season.valueEur), 0);
  const totalCaps = seasons.reduce((sum, season) => sum + season.national.caps, 0);

  const goat = computeGoatScore({
    role: player.role,
    seasons,
    trophies,
    awards,
    peakOverall,
    peakValueEur,
    totalCaps,
    startingLeagueLevel,
    showdowns,
    seasonsAheadOfRival,
  });

  return {
    player,
    seasons,
    peakOverall,
    retiredAt: player.age,
    clubsPlayed,
    trophies,
    awards,
    peakValueEur,
    totalCaps,
    goat,
    rival: {
      name: rival.name,
      clubName: rival.club.club.name,
      peakOverall: rival.seasons.reduce((peak, season) => Math.max(peak, season.overallEnd), 0),
      trophies: rival.seasons.reduce((sum, season) => sum + season.trophies.length, 0),
      goals: rival.seasons.reduce((sum, season) => sum + season.stats.goals, 0),
    },
    showdowns,
    choices,
    marks,
    injuries,
    seasonsAheadOfRival,
  };
}
```

- [ ] **Step 5: Eseguire i test del motore**

Run: `npx vitest run tests/engine/`
Expected: tutti verdi. I test di `career.test.ts` e `careerReal.test.ts` di Fase 2 devono continuare a passare: il contratto rallenta i trasferimenti, quindi se «un ragazzo bloccato in una big finisce per cambiare aria» fallisce, verificare che `canLeave` non stia bloccando anche i prestiti dei giovani — un giovane in prestito deve poter partire anche a contratto lungo.

- [ ] **Step 6: Commit**

```bash
git add src/engine/career.ts src/engine/types.ts tests/engine/careerFull.test.ts
git commit -m "feat: carriera completa con Rivale, bivi, contratto e punteggio GOAT"
```

---

### Task 11: Il Lab guarda le scelte

**Files:**
- Modify: `scripts/lab.ts`

- [ ] **Step 1: Aggiungere le misure nuove**

Dopo le righe già presenti:

```ts
  const goatScores = [...results.map((result) => result.goat.total)].sort((a, b) => a - b);
  const rivalWins = results.filter(
    (result) => result.seasonsAheadOfRival < result.seasons.length / 2,
  ).length / results.length;
  const choicesPerCareer = average(results.map((result) => result.choices.length));
  const injuriesPerCareer = average(results.map((result) => result.injuries.length));
  const withPermanentMark = results.filter((result) =>
    result.marks.some((mark) => mark.id === 'ginocchio-fragile'),
  ).length / results.length;
  const showdownRate = results.filter((result) => result.showdowns.length > 0).length / results.length;

  console.log(`Punteggio GOAT: p10 ${percentile(goatScores, 0.1)} | p50 ${percentile(goatScores, 0.5)} | p90 ${percentile(goatScores, 0.9)} | max ${goatScores.at(-1)}`);
  console.log(`Il Rivale chiude davanti nel ${(rivalWins * 100).toFixed(1)}% delle carriere`);
  console.log(`Decisioni per carriera: ${choicesPerCareer.toFixed(1)} | infortuni: ${injuriesPerCareer.toFixed(1)} | con ginocchio fragile: ${(withPermanentMark * 100).toFixed(1)}%`);
  console.log(`Carriere con almeno uno scontro diretto: ${(showdownRate * 100).toFixed(1)}%`);
```

- [ ] **Step 2: Aggiungere le invarianti**

```ts
  // Il Rivale deve essere un avversario vero: se vince quasi sempre è frustrante,
  // se perde quasi sempre è inutile (spec §3.4).
  if (rivalWins < 0.3 || rivalWins > 0.7) {
    failures.push(`il Rivale è sbilanciato: chiude davanti nel ${(rivalWins * 100).toFixed(1)}% delle carriere (atteso 30-70%)`);
  }
  if (choicesPerCareer < 5) {
    failures.push(`troppe poche decisioni per carriera: ${choicesPerCareer.toFixed(1)}`);
  }
  if (injuriesPerCareer < 1 || injuriesPerCareer > 8) {
    failures.push(`infortuni fuori scala: ${injuriesPerCareer.toFixed(1)} per carriera (atteso 1-8)`);
  }
  if (percentile(goatScores, 0.5) < 50 || percentile(goatScores, 0.5) > 700) {
    failures.push(`punteggio GOAT mediano fuori scala: ${percentile(goatScores, 0.5)}`);
  }
```

- [ ] **Step 3: Eseguire il Lab**

Run: `npm run lab -- --careers=2000 --seed=42`
Expected: uscita pulita.

Se il Rivale è sbilanciato, il sospetto principale è che nasca in un campionato sistematicamente più forte o più debole di quello del giocatore: guardare `createRival`.

- [ ] **Step 4: Commit**

```bash
git add scripts/lab.ts
git commit -m "feat: il Lab misura Rivale, decisioni, infortuni e punteggio GOAT"
```

---

### Task 12: Nessuna scelta dominante

L'invariante più importante della spec §6, e quella che distingue un gioco di decisioni da un gioco di bottoni: **nessun ramo deve essere quello giusto più del 70% delle volte**. Se una strada è sempre la migliore, non è una scelta.

**Files:**
- Create: `scripts/choices-lab.ts`
- Modify: `package.json` (script `lab:choices`)

**Interfaces:**
- Consumes: `runCareer`, `DILEMMA_CATALOG`, `createFileWorldSource`
- Produces: comando `npm run lab:choices`

Come funziona: per ogni bivio del catalogo si giocano N carriere identiche (stesso seed, stesso mondo) forzando ogni volta una strada diversa, e si confrontano i punteggi GOAT finali. Una strada che vince più del 70% delle volte è dominante e va ribilanciata.

- [ ] **Step 1: Scrivere lo script**

`scripts/choices-lab.ts`:

```ts
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

/** Politica che forza sempre una certa opzione di un certo bivio, e per il resto fa il solito. */
function forcing(dilemmaId: string, optionId: string): DilemmaPolicy {
  return (dilemma, context) => {
    if (dilemma.id !== dilemmaId) return boldPolicy(dilemma, context);
    return dilemma.options.find((option) => option.id === optionId) ?? boldPolicy(dilemma, context);
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

    for (let i = 0; i < careers; i += 1) {
      const start = clubs[i % clubs.length]!;
      const scores = sample.options.map((option) => ({
        id: option.id,
        score: runCareer({
          create: { name: 'Test', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: start.leagueLevel },
          world: { clubs, startClubId: start.club.id },
          seed: i,
          dilemmaPolicy: forcing(entry.id, option.id),
        }).goat.total,
      }));
      const best = scores.reduce((champion, item) => (item.score > champion.score ? item : champion));
      totals.set(best.id, (totals.get(best.id) ?? 0) + 1);
    }

    const line = [...totals.entries()]
      .map(([id, wins]) => `${id} ${((wins / careers) * 100).toFixed(0)}%`)
      .join(' | ');
    console.log(`${entry.id}: ${line}`);

    for (const [id, wins] of totals) {
      const share = wins / careers;
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
```

- [ ] **Step 2: Aggiungere lo script a `package.json`**

```json
    "lab:choices": "tsx scripts/choices-lab.ts",
```

e aggiornare `verify`:

```json
    "verify": "npm run check && npm run lab -- --careers=2000 --seed=42 && npm run lab:choices -- --careers=100"
```

- [ ] **Step 3: Eseguire**

Run: `npm run lab:choices -- --careers=150`

Expected: nessuna scelta dominante. Se una lo è, la correzione va fatta **negli effetti del catalogo**, non nella soglia: alzare il costo dell'opzione troppo buona o il premio di quella troppo debole. Attenzione a un caso legittimo: un'opzione può vincere spesso perché le altre sono deliberatamente rischiose — ma allora il rischio deve pagare quando va bene, e va verificato che la varianza dei punteggi sia alta.

- [ ] **Step 4: Registrare l'esito in `docs/decisions.md`**

Aggiungere una voce `D-009` con i numeri veri: percentuale di vittoria di ogni strada per ogni bivio, quali sono stati ribilanciati e perché.

- [ ] **Step 5: Verifica finale**

```bash
npm run verify
```

- [ ] **Step 6: Commit**

```bash
git add scripts/choices-lab.ts package.json docs/decisions.md
git commit -m "feat: verifica che nessuna scelta sia dominante (spec §6)"
```

---

## Verifica finale della Fase 3

```bash
npm run check
npm run lab -- --careers=5000 --seed=1
npm run lab:choices -- --careers=200
```

Tutti e tre devono uscire puliti. Il Lab deve mostrare: il Rivale davanti fra il 30% e il 70% delle carriere, almeno 5 decisioni per carriera, fra 1 e 8 infortuni, punteggio GOAT mediano fra 50 e 700, e nessuna strada dominante oltre il 70%.

## Cosa NON si costruisce in questa fase

L'interfaccia, il poster, Next.js, il salvataggio a seed su disco, le pagine SEO. Sono Fase 4 e 5. In particolare: la `DilemmaPolicy` e la `TransferPolicy` restano funzioni automatiche — sostituirle con l'utente è esattamente il lavoro della Fase 4, ed è già previsto dalle firme.
