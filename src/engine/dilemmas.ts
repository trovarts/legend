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
