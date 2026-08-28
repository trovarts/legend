'use client';

import { useEffect, useState } from 'react';
import type { YouthSeason } from '../engine/youth';

/** Il resoconto di un anno di vivaio: quattro numeri e l'overall che sale. */
export function AnnoVivaio({ season, onEnd }: { season: YouthSeason; onEnd: () => void }) {
  const [valore, setValore] = useState(season.overallStart);
  const salita = season.overallEnd - season.overallStart;

  useEffect(() => {
    if (salita === 0) return undefined;
    const timer = setInterval(() => {
      setValore((corrente) => {
        if (corrente >= season.overallEnd) {
          clearInterval(timer);
          return corrente;
        }
        return corrente + 1;
      });
    }, 320);
    return () => clearInterval(timer);
  }, [salita, season.overallEnd]);

  return (
    <section className="giornale vivaio-resoconto">
      <header className="testata">
        <span className="testata-nome">{season.clubName.toUpperCase()}</span>
        <span className="testata-data">{season.age} anni · vivaio</span>
      </header>

      <span className="occhiello">{season.year}° anno · in formazione</span>
      <h2 className="titolone">
        {season.year === 1 ? 'Primo anno nel vivaio' : `${season.year}° anno nel vivaio`}
      </h2>
      <p className="sommario">
        Tornei, amichevoli e doppie sedute nel settore giovanile di {season.clubName}.
        Si costruisce dal basso.
      </p>

      <div className="vivaio-griglia">
        <div className="vivaio-numeri">
          <span className="contesto-etichetta">Rendimento nel vivaio</span>
          <div className="vivaio-caselle">
            {([
              ['PRES', season.appearances],
              ['GOL', season.goals],
              ['AST', season.assists],
              ['MEDIA', season.rating.toFixed(1)],
            ] as const).map(([nome, valore2]) => (
              <div key={nome} className="vivaio-casella">
                <span className="contesto-etichetta">{nome}</span>
                <b className="numero">{valore2}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="vivaio-crescita">
          <span className="contesto-etichetta">OVR</span>
          <span className="salita">
            <span className="salita-da numero">{season.overallStart}</span>
            <span aria-hidden="true">→</span>
            <b className={`salita-a numero${salita > 0 ? ' salita-oro' : ''}`}>{valore}</b>
          </span>
          <span className={salita > 0 ? 'salita-oro' : 'tenue'}>
            {salita > 0 ? `+${salita} OVR` : season.outcomeLabel}
          </span>
          <span className="tenue" style={{ fontSize: '.78rem' }}>Crescita nel settore giovanile</span>
        </div>
      </div>

      <button type="button" className="avanti" onClick={onEnd}>
        <span>Continua</span>
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
