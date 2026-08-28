'use client';

import { useMemo } from 'react';
import type { CandidateClub } from '../engine/market';
import { decisionKey, playCareer, type CareerSave } from '../engine/play';
import { Bivio } from './Bivio';
import { Mercato } from './Mercato';
import { Preparazione } from './Preparazione';
import { Stagione } from './Stagione';
import { Verdetto } from './Verdetto';

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
  const pending = state.pending;

  const decide = (patch: Partial<CareerSave['decisions']>): void => {
    onChange({ ...save, decisions: { ...save.decisions, ...patch } });
  };

  return (
    <>
      <h1>{save.create.name}</h1>

      {pending?.kind === 'training' && (
        <Preparazione
          season={pending.season}
          age={pending.age}
          clubName={pending.clubName}
          onChoose={(axis) =>
            decide({ training: { ...save.decisions.training, [String(pending.season)]: axis } })
          }
        />
      )}

      {pending?.kind === 'dilemma' && (
        <Bivio
          dilemma={pending.dilemma}
          soFar={pending.soFar}
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

      {state.seasons.length > 0 && (
        <>
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
      )}
    </>
  );
}
