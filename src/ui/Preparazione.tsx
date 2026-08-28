'use client';

import { TRAINING_AXES, type TrainingAxis } from '../engine/training';

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
    <div className="card">
      <h2>Preparazione — stagione {season}</h2>
      <p className="tenue">
        {age} anni, {clubName}. Su cosa lavori quest&apos;anno: una scelta sola, e conta per sempre.
      </p>
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
