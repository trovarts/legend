'use client';

import type { SeasonRecord } from '../engine/types';

const L = 320;
const A = 120;
const MARGINE = { su: 10, giu: 18, sinistra: 4, destra: 4 };

/**
 * La carriera come una linea.
 *
 * Una tabella di vent'anni si legge una riga per volta; una curva si legge in un
 * secondo — dove sei salito, dove ti sei fermato, quando hanno cominciato a pesare
 * gli anni. È la cosa che un elenco di numeri non riesce a dire.
 */
export function Curva({ seasons }: { seasons: readonly SeasonRecord[] }) {
  if (seasons.length < 3) return null;

  const overall = seasons.map((stagione) => stagione.overallEnd);
  const gol = seasons.map((stagione) => stagione.stats.goals);
  const minimo = Math.min(...overall) - 2;
  const massimo = Math.max(...overall) + 2;
  const golMax = Math.max(1, ...gol);

  const larghezza = L - MARGINE.sinistra - MARGINE.destra;
  const altezza = A - MARGINE.su - MARGINE.giu;
  const x = (indice: number): number =>
    MARGINE.sinistra + (seasons.length === 1 ? larghezza / 2 : (indice / (seasons.length - 1)) * larghezza);
  const y = (valore: number): number =>
    MARGINE.su + altezza - ((valore - minimo) / Math.max(1, massimo - minimo)) * altezza;

  const linea = overall.map((valore, indice) => `${indice === 0 ? 'M' : 'L'}${x(indice).toFixed(1)} ${y(valore).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(seasons.length - 1).toFixed(1)} ${MARGINE.su + altezza} L${x(0).toFixed(1)} ${MARGINE.su + altezza} Z`;

  const picco = overall.indexOf(Math.max(...overall));
  const passo = Math.max(1, Math.round(seasons.length / 5));

  return (
    <div className="curva-blocco">
      <span className="contesto-etichetta">La curva della carriera · overall e gol per stagione</span>
      <svg viewBox={`0 0 ${L} ${A}`} className="curva" role="img" aria-label="Andamento dell'overall e dei gol stagione per stagione">
        {gol.map((quanti, indice) => {
          const h = (quanti / golMax) * (altezza * 0.55);
          return (
            <rect
              key={`g${indice}`}
              className="curva-gol"
              x={x(indice) - 2.2}
              y={MARGINE.su + altezza - h}
              width={4.4}
              height={Math.max(0.6, h)}
              rx={1.4}
            />
          );
        })}

        <path className="curva-area" d={area} />
        <path className="curva-linea" d={linea} />

        <circle className="curva-picco" cx={x(picco)} cy={y(overall[picco]!)} r={3.2} />
        <text className="curva-etichetta" x={x(picco)} y={y(overall[picco]!) - 6} textAnchor="middle">
          {overall[picco]}
        </text>

        {seasons.map((stagione, indice) =>
          indice % passo === 0 || indice === seasons.length - 1 ? (
            <text key={`e${indice}`} className="curva-anno" x={x(indice)} y={A - 5} textAnchor="middle">
              {stagione.age}
            </text>
          ) : null,
        )}
      </svg>
      <p className="tenue curva-legenda">
        <span className="curva-punto curva-punto-linea" aria-hidden="true" /> overall a fine stagione
        <span className="curva-punto curva-punto-gol" aria-hidden="true" /> gol
        <span className="curva-eta">età in basso</span>
      </p>
    </div>
  );
}
