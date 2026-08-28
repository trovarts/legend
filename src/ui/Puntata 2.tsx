'use client';

import type { DilemmaEffects, DilemmaOption } from '../engine/types';

export interface Faccia {
  chance: number | null;
  testo: string;
  segno: 'bene' | 'male' | 'neutro';
}

const NOMI_SEGNO: Record<string, string> = {
  'ginocchio-fragile': 'ginocchio fragile',
  'uomo-spogliatoio': 'uomo spogliatoio',
  'rissa-col-mister': 'rottura col mister',
  mercenario: 'fama da mercenario',
  bandiera: 'bandiera',
  'beniamino-dei-tifosi': 'beniamino',
  'promessa-tradita': 'promessa tradita',
  'tornato-a-casa': 'ritorno a casa',
  'carattere-fragile': 'testa fragile',
  'leader-riconosciuto': 'leader',
};

/**
 * Traduce gli effetti di un esito in una manciata di parole da tabellone.
 * Sono gli stessi numeri che il motore userà: qui non si abbellisce niente.
 */
export function facceDi(effects: DilemmaEffects): Faccia[] {
  const facce: Faccia[] = [];
  if (effects.overall !== undefined && effects.overall !== 0) {
    facce.push({
      chance: null,
      testo: `${effects.overall > 0 ? '+' : ''}${effects.overall} OVR`,
      segno: effects.overall > 0 ? 'bene' : 'male',
    });
  }
  if (effects.minutesDelta !== undefined && effects.minutesDelta !== 0) {
    const punti = Math.round(effects.minutesDelta * 100);
    facce.push({
      chance: null,
      testo: `${punti > 0 ? '+' : ''}${punti}% minuti`,
      segno: punti > 0 ? 'bene' : 'male',
    });
  }
  if (effects.retirementDelta !== undefined && effects.retirementDelta !== 0) {
    facce.push({
      chance: null,
      testo: `${effects.retirementDelta} anni di carriera`,
      segno: 'male',
    });
  }
  if (effects.valueMultiplier !== undefined && effects.valueMultiplier !== 1) {
    const punti = Math.round((effects.valueMultiplier - 1) * 100);
    facce.push({
      chance: null,
      testo: `${punti > 0 ? '+' : ''}${punti}% valore`,
      segno: punti > 0 ? 'bene' : 'male',
    });
  }
  if (effects.addMark) {
    const nome = NOMI_SEGNO[effects.addMark.id] ?? effects.addMark.id;
    const cattivo = ['ginocchio-fragile', 'rissa-col-mister', 'mercenario', 'promessa-tradita', 'carattere-fragile']
      .includes(effects.addMark.id);
    facce.push({ chance: null, testo: nome, segno: cattivo ? 'male' : 'bene' });
  }
  if (effects.removeMark) {
    facce.push({ chance: null, testo: `via ${NOMI_SEGNO[effects.removeMark] ?? effects.removeMark}`, segno: 'bene' });
  }
  if (facce.length === 0) facce.push({ chance: null, testo: 'niente cambia', segno: 'neutro' });
  // Davanti va il numero: è quello che si legge a colpo d'occhio.
  return [...facce].sort((a, b) => Number(/\d/.test(b.testo)) - Number(/\d/.test(a.testo)));
}

/** La puntata di un'opzione: cosa può uscire, con che probabilità. */
export function Puntata({ option }: { option: DilemmaOption }) {
  const certo = option.outcomes.length === 1;

  return (
    <span className="puntata">
      {option.outcomes.map((outcome, index) => {
        const facce = facceDi(outcome.effects);
        const principale = facce[0]!;
        const secondarie = facce.slice(1);
        return (
          <span key={index} className={`faccia faccia-${principale.segno}`}>
            {!certo && <b className="faccia-quota">{Math.round(outcome.chance * 100)}%</b>}
            <span className="faccia-esito">{principale.testo}</span>
            {secondarie.length > 0 && (
              <span className="faccia-extra">{secondarie.map((f) => f.testo).join(' · ')}</span>
            )}
          </span>
        );
      })}
    </span>
  );
}
