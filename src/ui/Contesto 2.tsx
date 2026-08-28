'use client';

import type { SeasonRecord } from '../engine/types';

/**
 * Il pannello che tiene sempre sott'occhio dove sei: quanto giochi, cosa ti chiede
 * la società, con chi. Senza, ogni decisione si prende al buio.
 */
export function Contesto({
  last,
  clubStrengthValue,
  contractYearsLeft,
}: {
  last: SeasonRecord | undefined;
  clubStrengthValue: number | null;
  contractYearsLeft: number | null;
}) {
  if (!last) return null;
  const titolarita = Math.round(last.minutesShare * 100);

  return (
    <div className="contesto">
      <div className="contesto-blocco">
        <span className="contesto-etichetta">Titolarità</span>
        <div className="contesto-barra" aria-hidden="true">
          <span style={{ width: `${titolarita}%` }} />
        </div>
        <span className="numero contesto-valore">{titolarita}/100</span>
      </div>

      <div className="contesto-blocco">
        <span className="contesto-etichetta">Il club</span>
        <b>{last.clubName}</b>
        <span className="tenue numero">
          {last.leagueName}
          {clubStrengthValue !== null && ` · rosa ${clubStrengthValue.toFixed(0)}`}
        </span>
      </div>

      <div className="contesto-blocco">
        <span className="contesto-etichetta">Ultima stagione</span>
        <b className="numero">{last.position}° posto</b>
        <span className="tenue numero">
          {last.stats.appearances} presenze · {last.stats.goals} gol
        </span>
      </div>

      <div className="contesto-blocco">
        <span className="contesto-etichetta">Contratto</span>
        <b className="numero">
          {contractYearsLeft === null
            ? '—'
            : contractYearsLeft <= 0
              ? 'in scadenza'
              : `${contractYearsLeft} ${contractYearsLeft === 1 ? 'anno' : 'anni'}`}
        </b>
        <span className="tenue">{last.marks.length > 0 ? `${last.marks.length} segni addosso` : 'nessun segno'}</span>
      </div>
    </div>
  );
}
