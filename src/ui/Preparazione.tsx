'use client';

import { TRAINING_AXES, trainingEffect, type TrainingAxis } from '../engine/training';
import { Scelta, Scelte } from './Scelte';

/** Sigle distinte: "Tecnica" e "Testa" comincerebbero entrambe per TE. */
const SIGLE: Record<TrainingAxis, string> = {
  tecnica: 'TEC',
  fisico: 'FIS',
  testa: 'MEN',
  leadership: 'CAP',
};

function badgeDi(axis: TrainingAxis): { testo: string; rischio: boolean } {
  const effect = trainingEffect(axis);
  if (effect.growthMultiplier > 1) return { testo: `crescita +${Math.round((effect.growthMultiplier - 1) * 100)}%`, rischio: false };
  if (effect.physiqueDelta > 0) return { testo: `+${effect.physiqueDelta} fisico`, rischio: false };
  if (effect.minutesDelta > 0) return { testo: `+${Math.round(effect.minutesDelta * 100)}% minuti`, rischio: false };
  return { testo: `${Math.round(effect.leadershipChance * 100)}% leader`, rischio: true };
}

export function Preparazione({
  season,
  age,
  clubName,
  onChoose,
}: {
  season: number;
  age: number;
  clubName: string;
  onChoose: (axis: TrainingAxis) => void;
}) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">RITIRO</span>
        <span className="testata-data">pre-stagione · stagione {season}</span>
      </header>
      <h2 className="titolone">Su cosa lavori</h2>
      <p className="sommario">
        {age} anni, {clubName}. Una scelta sola per tutta l&apos;estate, e conta per sempre.
      </p>
      <Scelte>
        {TRAINING_AXES.map((axis) => {
          const badge = badgeDi(axis.id);
          return (
            <Scelta
              key={axis.id}
              sigla={SIGLE[axis.id]}
              titolo={axis.label}
              nota={axis.promise}
              badge={badge.testo}
              rischio={badge.rischio}
              onClick={() => onChoose(axis.id)}
            />
          );
        })}
      </Scelte>
    </section>
  );
}
