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
