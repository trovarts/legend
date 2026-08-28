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
    promise: "Cresci più in fretta quest'anno, se giochi abbastanza da metterlo in pratica.",
  },
  {
    id: 'fisico',
    label: 'Fisico',
    promise: "Ti fai male meno spesso e reggi più a lungo, ma quest'anno non migliori.",
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
  testa: { growthMultiplier: 1, physiqueDelta: 0, minutesDelta: 0.07, leadershipChance: 0 },
  leadership: { growthMultiplier: 1, physiqueDelta: 0, minutesDelta: 0, leadershipChance: 0.28 },
};

export function trainingEffect(axis: TrainingAxis): TrainingEffect {
  return EFFECTS[axis];
}
