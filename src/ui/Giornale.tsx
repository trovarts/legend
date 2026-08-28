'use client';

import { seasonMoments } from '../engine/moments';
import type { RivalSnapshot, SeasonRecord } from '../engine/types';

/** Testate diverse a rotazione: dà l'impressione di una rassegna stampa, non di un template. */
const TESTATE = ['NOVANTA MINUTI', 'IL CORRIERE DEL CAMPO', 'PALLONE', 'FUORICLASSE', 'PRIMA PAGINA'];
const MESI = ['giugno', 'luglio', 'agosto', 'settembre'];

function titoloDi(record: SeasonRecord, momento: string): string {
  const stats = record.stats;
  if (record.trophies.length > 0) {
    return `${record.clubName}: è ${record.trophies[0]!.competitionName.toUpperCase()}`;
  }
  if (record.awards.length > 0) return `L'anno di ${record.clubName}: nessuno come lui`;
  if (record.injury && record.injury.severity !== 'lieve') {
    return `Si ferma sul più bello: ${record.injury.matchesOut} partite fuori`;
  }
  if (stats.goals >= 18) return `${stats.goals} gol: la stagione che cambia tutto`;
  if (record.minutesShare < 0.2) return 'Un anno in tribuna, e la pazienza finisce';
  if (record.position === 1) return `${record.clubName} in testa, e lui c'era`;
  if (record.position >= 18) return 'Salvezza a fatica, e adesso?';
  return momento;
}

export function Giornale({
  record,
  previous,
  isFirst,
  playerName,
  rival,
}: {
  record: SeasonRecord;
  previous: SeasonRecord | undefined;
  isFirst: boolean;
  playerName: string;
  rival: RivalSnapshot | null;
}) {
  const moments = seasonMoments({ record, previous, isFirstSeason: isFirst, playerName });
  const testata = TESTATE[record.season % TESTATE.length]!;
  const mese = MESI[record.season % MESI.length]!;
  const anno = 2026 + record.season;
  const principale = moments[0]?.text ?? 'Una stagione da raccontare';
  const resto = moments.slice(1);

  return (
    <article className="giornale">
      <header className="testata">
        <span className="testata-nome">{testata}</span>
        <span className="testata-data">
          {mese} {anno} · stagione {record.season}
        </span>
      </header>

      <span className="occhiello">
        {record.leagueName} · {record.position}° posto
      </span>

      <h2 className="titolone">{titoloDi(record, principale)}</h2>

      <p className="sommario numero">
        {playerName} · {record.age} anni · {record.clubName} · {record.stats.appearances} presenze ·{' '}
        {record.stats.goals} gol · {record.stats.assists} assist · media {record.stats.rating.toFixed(1)}
      </p>

      <div className="corpo">
        <div className="pezzo">
          <p className="etichetta">La stagione</p>
          <p>{principale}</p>
          {resto.map((moment) => (
            <p key={moment.id}>{moment.text}</p>
          ))}
        </div>

        <aside className="spalla">
          <p className="etichetta">Dal campo</p>
          {record.choices.length > 0 ? (
            record.choices.map((choice) => (
              <p key={`${choice.dilemmaId}-${choice.optionId}`}>
                <strong>{choice.optionLabel}</strong> — {choice.outcomeText}
              </p>
            ))
          ) : (
            <p className="tenue">Nessuna decisione da prima pagina, quest&apos;anno.</p>
          )}
          {rival && (
            <p style={{ borderTop: '1px solid var(--bordo)', paddingTop: '.5rem' }}>
              <strong>{rival.name}</strong>: {rival.goals} gol, OVR {rival.overall}.{' '}
              {rival.aheadOfYou ? 'Quest’anno è andato meglio di te.' : 'Quest’anno gli sei stato davanti.'}
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
