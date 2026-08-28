'use client';

import type { CareerResult } from '../engine/types';

/**
 * Tu e lui, uno accanto all'altro.
 *
 * Il Rivale ha giocato la sua carriera in parallelo per tutto il tempo, e alla fine
 * la domanda è una sola. Un punteggio non la risponde: due colonne sì.
 */
export function Confronto({ result, nome }: { result: CareerResult; nome: string }) {
  const gol = result.seasons.reduce((somma, stagione) => somma + stagione.stats.goals, 0);
  const trofei = result.trophies.length;
  const davanti = result.seasonsAheadOfRival > result.seasons.length / 2;
  const scontri = result.showdowns.filter((s) => s.won).length;

  const righe = [
    { nome: 'picco', mio: result.peakOverall, suo: result.rival.peakOverall },
    { nome: 'gol', mio: gol, suo: result.rival.goals },
    { nome: 'trofei', mio: trofei, suo: result.rival.trophies },
  ];

  /*
   * Chi è in oro è chi ha chiuso davanti, e il metro è lo stesso del verdetto qui
   * sotto: le stagioni passate davanti. Contare le righe vinte dava un vincitore
   * diverso da quello annunciato due centimetri più giù.
   */

  return (
    <div className="card confronto">
      <span className="contesto-etichetta">Il confronto che conta</span>

      <div className="confronto-testa">
        <span className={`confronto-chi${davanti ? ' confronto-vince' : ''}`}>{nome}</span>
        <span className="confronto-contro">contro</span>
        <span className={`confronto-chi${davanti ? '' : ' confronto-vince'}`}>{result.rival.name}</span>
      </div>
      <p className="tenue confronto-club">
        {result.clubsPlayed[result.clubsPlayed.length - 1] ?? ''} · {result.rival.clubName}
      </p>

      {righe.map((riga) => {
        const totale = Math.max(1, riga.mio + riga.suo);
        return (
          <div key={riga.nome} className="confronto-riga">
            <b className={`numero${riga.mio >= riga.suo ? ' confronto-meglio' : ''}`}>{riga.mio}</b>
            <span className="confronto-barra" aria-hidden="true">
              <span className="confronto-mia" style={{ width: `${(riga.mio / totale) * 100}%` }} />
              <span className="confronto-sua" style={{ width: `${(riga.suo / totale) * 100}%` }} />
            </span>
            <b className={`numero${riga.suo > riga.mio ? ' confronto-meglio' : ''}`}>{riga.suo}</b>
            <span className="confronto-nome">{riga.nome}</span>
          </div>
        );
      })}

      <p className="confronto-verdetto">
        {davanti
          ? `Gli sei stato davanti per ${result.seasonsAheadOfRival} stagioni su ${result.seasons.length}.`
          : `Ti è rimasto davanti: tu davanti solo ${result.seasonsAheadOfRival} stagioni su ${result.seasons.length}.`}
        {result.showdowns.length > 0 &&
          ` Negli scontri diretti: ${scontri} su ${result.showdowns.length}.`}
      </p>
    </div>
  );
}
