'use client';

import { useEffect, useState } from 'react';
import type { RivalSnapshot, SeasonRecord } from '../engine/types';

/** Il numero che sale davanti agli occhi: è il momento in cui si vede di essere migliorati. */
function Contatore({ da, a }: { da: number; a: number }) {
  const [valore, setValore] = useState(da);

  useEffect(() => {
    if (a === da) return undefined;
    const passo = a > da ? 1 : -1;
    const timer = setInterval(() => {
      setValore((corrente) => {
        if (corrente === a) {
          clearInterval(timer);
          return corrente;
        }
        return corrente + passo;
      });
    }, 220);
    return () => clearInterval(timer);
  }, [da, a]);

  return (
    <span className="salita">
      <span className="salita-da numero">{da}</span>
      <span aria-hidden="true">→</span>
      <b className={`salita-a numero${a > da ? ' salita-su' : a < da ? ' salita-giu' : ''}`}>{valore}</b>
    </span>
  );
}

export function Resoconto({
  record,
  rival,
  onEnd,
}: {
  record: SeasonRecord;
  rival: RivalSnapshot | null;
  onEnd: () => void;
}) {
  const differenza = record.overallEnd - record.overallStart;

  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">RESOCONTO</span>
        <span className="testata-data">
          {record.clubName} · stagione {record.season}
        </span>
      </header>

      <div className="resoconto-cifre">
        <div className="resoconto-blocco">
          <span className="contesto-etichetta">Overall</span>
          <Contatore da={record.overallStart} a={record.overallEnd} />
          {differenza !== 0 && (
            <span className={differenza > 0 ? 'salita-su' : 'salita-giu'}>
              {differenza > 0 ? '+' : ''}{differenza} in un anno
            </span>
          )}
        </div>
        {rival && (
          <div className="resoconto-blocco">
            <span className="contesto-etichetta">{rival.name}</span>
            <span className="salita">
              <b className="salita-a numero">{rival.overall}</b>
            </span>
            <span className={rival.aheadOfYou ? 'salita-giu' : 'salita-su'}>
              {rival.aheadOfYou ? 'quest’anno meglio di te' : 'quest’anno peggio di te'}
            </span>
          </div>
        )}
      </div>

      <div className="riga numero" style={{ borderTop: '1px solid var(--bordo)', paddingTop: '.8rem' }}>
        <span>{record.stats.appearances} presenze</span>
        <span>{record.stats.goals} gol</span>
        <span>{record.stats.assists} assist</span>
        <span>media {record.stats.rating.toFixed(1)}</span>
      </div>

      <button type="button" className="avanti" onClick={onEnd}>
        <span>Continua</span>
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
