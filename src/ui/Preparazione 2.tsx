'use client';

import type { ClubObjectives } from '../engine/objectives';
import { TRAINING_AXES, trainingEffect, type TrainingAxis } from '../engine/training';
import { dataDi, etichettaStagione } from './calendario';
import { Scelta, Scelte } from './Scelte';

/** Sigle distinte: "Tecnica" e "Testa" comincerebbero entrambe per TE. */
const SIGLE: Record<TrainingAxis, string> = {
  tecnica: 'TEC',
  fisico: 'FIS',
  testa: 'MEN',
  leadership: 'CAP',
};

interface Facce { quota: number | null; testo: string; segno: 'bene' | 'male' }

function facceDi(axis: TrainingAxis): Facce[] {
  const effect = trainingEffect(axis);
  if (effect.growthMultiplier > 1) {
    return [{ quota: null, testo: `crescita +${Math.round((effect.growthMultiplier - 1) * 100)}%`, segno: 'bene' }];
  }
  if (effect.physiqueDelta > 0) {
    return [{ quota: null, testo: `+${effect.physiqueDelta} fisico`, segno: 'bene' }];
  }
  if (effect.minutesDelta > 0) {
    return [{ quota: null, testo: `+${Math.round(effect.minutesDelta * 100)}% minuti`, segno: 'bene' }];
  }
  // La leadership è l'unica puntata dell'estate: o esce, o l'anno è passato invano.
  const quota = Math.round(effect.leadershipChance * 100);
  return [
    { quota, testo: 'leader', segno: 'bene' },
    { quota: 100 - quota, testo: 'niente', segno: 'male' },
  ];
}

export function Preparazione({
  season,
  age,
  clubName,
  objectives,
  onChoose,
}: {
  season: number;
  age: number;
  clubName: string;
  objectives: ClubObjectives;
  onChoose: (axis: TrainingAxis) => void;
}) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">RITIRO</span>
        <span className="testata-data">
          {dataDi('ritiro', season)} · pre-stagione {etichettaStagione(season)}
        </span>
      </header>
      <h2 className="titolone">Su cosa lavori</h2>
      <p className="sommario">
        {age} anni, {clubName}. Una scelta sola per tutta l&apos;estate, e conta per sempre.
      </p>
      <div className="obiettivi">
        <span className="contesto-etichetta">Cosa ti chiede il club</span>
        <div className="obiettivo">
          <span className="obiettivo-grado">Principale</span>
          <span className="obiettivo-testo">{objectives.primary.text}</span>
        </div>
        <div className="obiettivo">
          <span className="obiettivo-grado obiettivo-grado-minore">Secondario</span>
          <span className="obiettivo-testo">{objectives.secondary.text}</span>
        </div>
      </div>

      <Scelte>
        {TRAINING_AXES.map((axis) => {
          const facce = facceDi(axis.id);
          const scommessa = facce.length > 1;
          return (
            <Scelta
              key={axis.id}
              sigla={SIGLE[axis.id]}
              titolo={axis.label}
              nota={axis.promise}
              etichetta={scommessa ? 'una scommessa' : 'esito certo'}
              sicura={!scommessa}
              puntata={
                <span className="puntata">
                  {facce.map((faccia) => (
                    <span key={faccia.testo} className={`faccia faccia-${faccia.segno}`}>
                      {faccia.quota !== null && <b className="faccia-quota">{faccia.quota}%</b>}
                      <span className="faccia-esito">{faccia.testo}</span>
                    </span>
                  ))}
                </span>
              }
              onClick={() => onChoose(axis.id)}
            />
          );
        })}
      </Scelte>
    </section>
  );
}
