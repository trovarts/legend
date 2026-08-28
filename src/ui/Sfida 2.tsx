'use client';

import { useEffect, useState } from 'react';
import type { DailyChallenge } from '../engine/challenge';
import { leggiSfida, strisciaViva } from './sfidaSalvata';

/** La sfida di oggi con la striscia: il motivo per tornare domani. */
export function Sfida({ sfida, oggi }: { sfida: DailyChallenge; oggi: string }) {
  const [striscia, setStriscia] = useState(0);
  const [fattaOggi, setFattaOggi] = useState(false);

  useEffect(() => {
    const stato = leggiSfida(window.localStorage);
    setStriscia(strisciaViva(stato, oggi));
    setFattaOggi(stato.ultimoGiorno === oggi);
  }, [oggi]);

  return (
    <section className="sfida">
      <span className="contesto-etichetta">
        Sfida di oggi
        {fattaOggi && <span className="sfida-fatta"> · centrata</span>}
      </span>
      <div className="riga" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ marginBottom: '.3rem' }}>{sfida.title}</h2>
          <p className="tenue" style={{ margin: 0 }}>{sfida.text}</p>
          {striscia > 0 && (
            <p className="sfida-striscia">
              🔥 {striscia} {striscia === 1 ? 'giorno' : 'giorni'} di fila
            </p>
          )}
        </div>
        <div className="sfida-target">
          <b className="numero">{sfida.target}</b>
          <span>{sfida.unit}</span>
        </div>
      </div>
    </section>
  );
}
