'use client';

import { useEffect, useState } from 'react';
import { leggiAlbo, type VoceAlbo } from './alboSalvato';

/** Le carriere migliori chiuse su questo dispositivo: il numero da battere. */
export function Albo({ evidenzia }: { evidenzia?: number }) {
  const [voci, setVoci] = useState<readonly VoceAlbo[]>([]);

  useEffect(() => setVoci(leggiAlbo(window.localStorage)), []);

  if (voci.length === 0) return null;

  return (
    <section className="card">
      <span className="contesto-etichetta">Le tue carriere migliori</span>
      <div className="albo">
        {voci.slice(0, 5).map((voce, indice) => (
          <div
            key={`${voce.at}-${indice}`}
            className={`albo-riga${evidenzia === indice + 1 ? ' albo-nuova' : ''}`}
          >
            <span className="albo-posto numero">{indice + 1}</span>
            <span>
              <b>{voce.name}</b>
              <span className="tenue" style={{ display: 'block', fontSize: '.78rem' }}>
                {voce.clubName} · {voce.seasons} stagioni · picco {voce.peakOverall}
              </span>
            </span>
            <span className="albo-goat numero">{voce.goat}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
