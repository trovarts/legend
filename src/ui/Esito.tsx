'use client';

import { useEffect, useState } from 'react';
import { facceDi } from './Puntata';
import type { DilemmaEffects } from '../engine/types';

export interface FacciaEsito {
  chance: number;
  testo: string;
  dettaglio: string;
  buona: boolean;
}

/**
 * Il momento della verità: hai puntato, e adesso si vede com'è andata.
 * Le facce restano tutte in campo — quella uscita si accende, le altre si spengono —
 * così si capisce cosa si è rischiato davvero e non solo cosa è successo.
 */
export function Esito({
  titolo,
  scelta,
  facce,
  uscita,
  racconto,
  onEnd,
}: {
  titolo: string;
  scelta: string;
  facce: readonly FacciaEsito[];
  /** Indice della faccia uscita. */
  uscita: number;
  racconto: string;
  onEnd: () => void;
}) {
  const certa = facce.length <= 1;
  const [rivelato, setRivelato] = useState(certa);
  const [lampeggio, setLampeggio] = useState(0);

  useEffect(() => {
    if (certa) return undefined;
    // Mezzo secondo di sorteggio, poi il verdetto: il tempo di trattenere il fiato.
    const giro = setInterval(() => setLampeggio((n) => n + 1), 110);
    const fine = setTimeout(() => {
      clearInterval(giro);
      setRivelato(true);
    }, 900);
    return () => {
      clearInterval(giro);
      clearTimeout(fine);
    };
  }, [certa]);

  const vinta = facce[uscita]?.buona ?? true;

  return (
    <section className={`giornale esito-blocco${rivelato ? (vinta ? ' esito-vinta' : ' esito-persa') : ''}`}>
      <header className="testata">
        <span className="testata-nome">{rivelato ? (vinta ? 'È ANDATA BENE' : 'È ANDATA MALE') : 'IL SORTEGGIO'}</span>
        <span className="testata-data">{titolo}</span>
      </header>

      <p className="occhiello">{scelta}</p>

      <div className="esito-facce">
        {facce.map((faccia, indice) => {
          const attiva = rivelato ? indice === uscita : indice === lampeggio % facce.length;
          const spenta = rivelato && indice !== uscita;
          return (
            <div
              key={`${faccia.testo}-${indice}`}
              className={`esito-faccia${attiva ? ' esito-faccia-attiva' : ''}${spenta ? ' esito-faccia-spenta' : ''} faccia-${faccia.buona ? 'bene' : 'male'}`}
            >
              {!certa && <b className="faccia-quota">{Math.round(faccia.chance * 100)}%</b>}
              <span className="esito-faccia-testo">{faccia.testo}</span>
              {faccia.dettaglio !== '' && <span className="faccia-extra">{faccia.dettaglio}</span>}
              {rivelato && indice === uscita && <span className="esito-bollino">{vinta ? 'uscita' : 'uscita'}</span>}
            </div>
          );
        })}
      </div>

      {rivelato && (
        <>
          <p className="esito-racconto entra">{racconto}</p>
          <button type="button" className="avanti entra" onClick={onEnd}>
            <span>Continua</span>
            <span className="scorciatoia"><b>Spazio</b> →</span>
          </button>
        </>
      )}
    </section>
  );
}

/** Trasforma gli effetti del motore nelle facce da mostrare. */
export function facceDaEffetti(
  outcomes: readonly { chance: number; effects: DilemmaEffects }[],
): FacciaEsito[] {
  return outcomes.map((outcome) => {
    const tradotte = facceDi(outcome.effects);
    const principale = tradotte[0]!;
    return {
      chance: outcome.chance,
      testo: principale.testo,
      dettaglio: tradotte.slice(1).map((faccia) => faccia.testo).join(' · '),
      buona: principale.segno !== 'male',
    };
  });
}
