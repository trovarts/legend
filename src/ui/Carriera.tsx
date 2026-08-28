'use client';

import { useMemo } from 'react';
import type { CandidateClub } from '../engine/market';
import { decisionKey, playCareer, type CareerSave } from '../engine/play';
import { Bivio } from './Bivio';
import { Giornale } from './Giornale';
import { Mercato } from './Mercato';
import { Preparazione } from './Preparazione';
import { Tessera } from './Tessera';
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
  const seasons = state.seasons;
  const last = seasons[seasons.length - 1];
  const lastRival = state.rivals[state.rivals.length - 1] ?? null;

  const decide = (patch: Partial<CareerSave['decisions']>): void => {
    onChange({ ...save, decisions: { ...save.decisions, ...patch } });
  };

  return (
    <>
      <Tessera
        name={save.create.name}
        last={last}
        rival={lastRival}
        ora={
          pending?.kind === 'training'
            ? { age: pending.age, overall: pending.overall, clubName: pending.clubName }
            : pending?.kind === 'dilemma'
              ? { clubName: pending.soFar.clubName }
              : undefined
        }
      />

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
          clubName={last?.clubName ?? 'la tua squadra'}
          onChoose={(clubId) =>
            decide({ transfers: { ...save.decisions.transfers, [String(pending.season)]: clubId } })
          }
        />
      )}

      {state.finished && state.result !== null && <Verdetto result={state.result} />}

      {/* La stagione appena vissuta è la prima pagina; le altre stanno in archivio. */}
      {last && (
        <Giornale
          key={last.season}
          record={last}
          previous={seasons[seasons.length - 2]}
          isFirst={last.season === 1}
          playerName={save.create.name}
          rival={lastRival}
        />
      )}

      {seasons.length > 1 && (
        <details className="card archivio">
          <summary>Archivio · le {seasons.length - 1} stagioni precedenti</summary>
          {[...seasons.slice(0, -1)].reverse().map((record) => (
            <div key={record.season} className="archivio-riga">
              <span>
                <strong>{record.age} anni</strong>{' '}
                <span className="tenue">{record.clubName}</span>
              </span>
              <span className="numero tenue">
                {record.stats.appearances}p · {record.stats.goals}g · OVR {record.overallEnd}
                {record.trophies.length > 0 && ` · ${record.trophies.length}🏆`}
              </span>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
