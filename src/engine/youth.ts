import type { Rng } from './rng';

/**
 * Gli anni di vivaio: si comincia a quattordici anni, lontano dai riflettori.
 * Non c'è campionato, non c'è mercato: c'è solo come scegli di crescere, e ogni
 * scelta è una scommessa sul tuo corpo e sul tuo tempo.
 */
export type YouthApproach = 'forza-il-ritmo' | 'piano-completo' | 'proteggi-la-crescita';

export interface YouthOption {
  id: YouthApproach;
  title: string;
  approach: string;
  focus: string;
  text: string;
  /** Le facce della scommessa: probabilità e punti di overall. */
  outcomes: readonly { chance: number; overall: number; label: string }[];
}

export const YOUTH_OPTIONS: readonly YouthOption[] = [
  {
    id: 'forza-il-ritmo',
    title: 'Forza il ritmo',
    approach: 'Approccio aggressivo',
    focus: 'Focus fisico',
    text: 'Chiedi doppie sedute e carichi da categoria superiore: puoi accelerare molto, oppure scoprire che il fisico ha bisogno di tempo.',
    outcomes: [
      { chance: 0.5, overall: 3, label: '+3 OVR' },
      { chance: 0.5, overall: 0, label: 'nessuna variazione' },
    ],
  },
  {
    id: 'piano-completo',
    title: 'Segui il piano completo',
    approach: 'Approccio bilanciato',
    focus: 'Focus tattica',
    text: 'Alterni tecnica, tattica e atletica con lo staff: niente scorciatoie, ma una buona possibilità di fare un passo avanti concreto.',
    outcomes: [
      { chance: 0.6, overall: 2, label: '+2 OVR' },
      { chance: 0.4, overall: 0, label: 'nessuna variazione' },
    ],
  },
  {
    id: 'proteggi-la-crescita',
    title: 'Proteggi la crescita',
    approach: 'Approccio conservativo',
    focus: 'Focus finalizzazione',
    text: 'Scegli lavoro individuale, recupero e correzione dei fondamentali: meno esplosivo, ma senza il rischio di un anno sprecato.',
    outcomes: [{ chance: 1, overall: 1, label: '+1 OVR' }],
  },
];

export interface YouthSeason {
  /** Anno di vivaio, a partire da 1. */
  year: number;
  age: number;
  clubName: string;
  approach: YouthApproach;
  appearances: number;
  goals: number;
  assists: number;
  rating: number;
  overallStart: number;
  overallEnd: number;
  outcomeLabel: string;
}

export const YOUTH_START_AGE = 14;
/** A diciassette anni si decide: prima squadra o un altro anno fra i ragazzi. */
export const YOUTH_LAST_AGE = 17;

export function youthOption(id: YouthApproach): YouthOption {
  return YOUTH_OPTIONS.find((option) => option.id === id) ?? YOUTH_OPTIONS[1]!;
}

/**
 * Una stagione di vivaio: numeri da settore giovanile e la scommessa che hai scelto.
 * Nessun campionato vero, nessuna classifica: qui si costruisce e basta.
 */
export function playYouthSeason(
  input: {
    year: number;
    age: number;
    clubName: string;
    overall: number;
    potential: number;
    approach: YouthApproach;
  },
  rng: Rng,
): YouthSeason {
  const option = youthOption(input.approach);

  let roll = rng.next();
  let esito = option.outcomes[option.outcomes.length - 1]!;
  for (const outcome of option.outcomes) {
    roll -= outcome.chance;
    if (roll <= 0) {
      esito = outcome;
      break;
    }
  }

  // Nel vivaio non si può superare il proprio potenziale, ma ci si avvicina in fretta.
  const overallEnd = Math.min(input.potential, input.overall + esito.overall);
  const appearances = 12 + rng.int(0, 10);
  const talento = overallEnd / 55;

  return {
    year: input.year,
    age: input.age,
    clubName: input.clubName,
    approach: input.approach,
    appearances,
    goals: Math.max(0, Math.round(appearances * 0.28 * talento * (0.6 + rng.next() * 0.8))),
    assists: Math.max(0, Math.round(appearances * 0.16 * talento * (0.6 + rng.next() * 0.8))),
    rating: Math.round((6.1 + (overallEnd - 40) * 0.035 + (rng.next() - 0.5) * 0.4) * 10) / 10,
    overallStart: input.overall,
    overallEnd,
    outcomeLabel: esito.label,
  };
}
