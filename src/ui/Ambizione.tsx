'use client';

import type { Ambizione as Voce, ProgressoAmbizione } from '../engine/ambizione';

/**
 * L'ambizione mentre la stai inseguendo.
 *
 * Un obiettivo che si vede avvicinare cambia le decisioni: alla nona stagione con la
 * stessa maglia, l'offerta del club più forte pesa diversamente.
 */
export function Ambizione({
  voce,
  progresso,
  compatta = false,
}: {
  voce: Voce;
  progresso: ProgressoAmbizione;
  compatta?: boolean;
}) {
  if (voce.id === 'nessuna') return null;

  const quota = Math.min(1, progresso.target === 0 ? 0 : progresso.fatto / progresso.target);

  if (compatta) {
    return (
      <div className={`ambizione-riga${progresso.centrata ? ' ambizione-centrata' : ''}`}>
        <span className="ambizione-titolo">{voce.titolo}</span>
        <span className="ambizione-barra" aria-hidden="true">
          <span style={{ width: `${quota * 100}%` }} />
        </span>
        <span className="numero ambizione-conto">
          {progresso.centrata ? '✓' : `${Math.round(progresso.fatto)}/${progresso.target}`}
        </span>
      </div>
    );
  }

  return (
    <div className={`card ambizione${progresso.centrata ? ' ambizione-centrata' : ''}`}>
      <span className="contesto-etichetta">La tua ambizione · +{voce.premio} punti se la centri</span>
      <h3 style={{ margin: '.2rem 0 .1rem' }}>{voce.titolo}</h3>
      <p className="tenue" style={{ margin: '0 0 .5rem', fontSize: '.86rem' }}>{voce.testo}</p>
      <div className="ambizione-riga">
        <span className="ambizione-barra" aria-hidden="true">
          <span style={{ width: `${quota * 100}%` }} />
        </span>
        <span className="numero ambizione-conto">
          {progresso.centrata
            ? 'centrata'
            : `${Math.round(progresso.fatto)} su ${progresso.target} ${voce.unita}`}
        </span>
      </div>
    </div>
  );
}
