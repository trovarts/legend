'use client';

import type { RivalSnapshot, SeasonRecord } from '../engine/types';

function soldi(valore: number): string {
  return valore >= 1_000_000 ? `${(valore / 1_000_000).toFixed(1)}M` : `${Math.round(valore / 1000)}K`;
}

/**
 * Chi sei diventato, sempre sotto gli occhi mentre scorri — e il Rivale con te,
 * perché è il confronto che dà senso ai numeri (spec §3.4).
 */
export function Tessera({
  name,
  last,
  rival,
  ora,
}: {
  name: string;
  last: SeasonRecord | undefined;
  rival: RivalSnapshot | null;
  /** Dati della decisione in corso: prima che la stagione si chiuda, `last` non esiste ancora. */
  ora?: { age?: number; overall?: number; clubName?: string };
}) {
  const age = last?.age ?? ora?.age;
  const overall = last?.overallEnd ?? ora?.overall;
  const club = last?.clubName ?? ora?.clubName;
  return (
    <>
      <div className="tessera">
        <span className="tessera-nome">
          {name}
          {club !== undefined && <span className="tenue" style={{ fontWeight: 400 }}> · {club}</span>}
        </span>
        <span className="tessera-dati">
          <span className="tessera-dato">
            <b>{age ?? '—'}</b>
            <span>anni</span>
          </span>
          <span className="tessera-dato">
            <b>{overall ?? '—'}</b>
            <span>overall</span>
          </span>
          <span className="tessera-dato">
            <b>{last ? soldi(last.valueEur) : '—'}</b>
            <span>valore</span>
          </span>
        </span>
      </div>

      {rival && (
        <div className={`rivale ${rival.aheadOfYou ? 'rivale-avanti' : 'rivale-dietro'}`}>
          <span className="tenue" style={{ fontSize: '.6rem', letterSpacing: '.14em', textTransform: 'uppercase' }}>
            Il tuo rivale
          </span>
          <span>
            <strong>{rival.name}</strong> <span className="tenue">· {rival.clubName}</span>
          </span>
          <span className="numero tenue">
            {rival.goals}g · OVR {rival.overall}
          </span>
          <span
            className="rivale-verdetto"
            style={{ color: rival.aheadOfYou ? 'var(--rosso)' : 'var(--verde)' }}
          >
            {rival.aheadOfYou ? 'ti è davanti' : 'sei avanti tu'}
          </span>
        </div>
      )}
    </>
  );
}
