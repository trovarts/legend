'use client';

import { seasonMoments } from '../engine/moments';
import type { RivalSnapshot, SeasonRecord } from '../engine/types';
import type { Role } from '../world/types';
import { dataDi, etichettaStagione } from './calendario';

/** Testate diverse a rotazione: dà l'impressione di una rassegna stampa, non di un template. */
const TESTATE = ['NOVANTA MINUTI', 'IL CORRIERE DEL CAMPO', 'PALLONE', 'FUORICLASSE', 'PRIMA PAGINA'];

/**
 * Il titolo di prima pagina. Non è mai una statistica: un giornale titola sui fatti,
 * e se non è successo niente lo dice con onestà.
 */
function titoloDi(record: SeasonRecord, isFirst: boolean): string {
  const stats = record.stats;
  const club = record.clubName.toUpperCase();
  const crescita = record.overallEnd - record.overallStart;

  if (record.trophies.length > 0) {
    const trofeo = record.trophies[0]!;
    if (trofeo.kind === 'league') return `${club} CAMPIONE`;
    if (trofeo.kind === 'continental') return `L'EUROPA È DI ${club}`;
    return `COPPA: ${club} LA ALZA`;
  }
  if (record.awards.length > 0) {
    const premio = record.awards[0]!;
    if (premio.kind === 'topScorer') return `${stats.goals} GOL: NESSUNO COME LUI`;
    if (premio.kind === 'youngPlayer') return 'IL MIGLIORE DEI GIOVANI';
    return 'IL MIGLIORE DEL CAMPIONATO';
  }
  if (record.injury && record.injury.severity === 'grave') {
    return 'STAGIONE FINITA IN UN ATTIMO';
  }
  if (record.injury && record.injury.severity === 'seria') {
    return `SI FERMA: ${record.injury.matchesOut} PARTITE FUORI`;
  }
  if (isFirst) return `ESORDIO CON ${club}`;
  if (record.national.tournament) {
    return `NAZIONALE: FINO A ${record.national.tournament.stageReached.toUpperCase()}`;
  }
  if (stats.goals >= 18) return `${stats.goals} GOL, E LA GENTE IMPARA IL NOME`;
  if (record.minutesShare < 0.15) return 'UN ANNO A GUARDARE';
  if (record.position === 1) return `${club} IN TESTA`;
  if (record.position >= 18) return 'SALVEZZA SOFFERTA';
  if (crescita >= 4) return 'CRESCE, E SI VEDE';
  if (crescita <= -4) return 'LE GAMBE COMINCIANO A PARLARE';
  if (record.national.capped) return 'CHIAMATA IN NAZIONALE';
  if (stats.goals >= 10) return `DIECI GOL E PASSA: ${club} SI AFFIDA A LUI`;
  if (record.position <= 4) return `${club} IN ALTO, LUI C'ERA`;
  return `ANNO DI MESTIERE A ${club}`;
}

export function Giornale({
  record,
  previous,
  before,
  isFirst,
  playerName,
  role,
  rival,
}: {
  record: SeasonRecord;
  previous: SeasonRecord | undefined;
  /** Le stagioni già giocate prima di questa. */
  before?: readonly SeasonRecord[];
  isFirst: boolean;
  playerName: string;
  role?: Role;
  rival: RivalSnapshot | null;
}) {
  const moments = seasonMoments({ record, previous, isFirstSeason: isFirst, playerName, before, role });
  const testata = TESTATE[record.season % TESTATE.length]!;
  const data = dataDi('fine', record.season);
  const principale = moments[0]?.text ?? 'Una stagione da raccontare';
  const resto = moments.slice(1);
  const titolo = titoloDi(record, isFirst);

  return (
    <article className="giornale">
      <header className="testata">
        <span className="testata-nome">{testata}</span>
        <span className="testata-data">
          {data} · stagione {etichettaStagione(record.season)}
        </span>
      </header>

      <span className="occhiello">
        {record.leagueName} · {record.position}° posto
      </span>

      <h2 className="titolone">{titolo}</h2>

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
