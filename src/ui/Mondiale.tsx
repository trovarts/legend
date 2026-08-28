'use client';

import type { WorldCupRun } from '../engine/worldcup';

const TITOLI: Record<string, string> = {
  gironi: 'Fase a gironi',
  ottavi: 'Ottavi',
  quarti: 'Quarti',
  semifinale: 'Semifinale',
  finale: 'Finale',
};

export function Mondiale({ run, country }: { run: WorldCupRun; country: string }) {
  const fasi = ['gironi', 'ottavi', 'quarti', 'semifinale', 'finale'] as const;

  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">{run.name.toUpperCase()}</span>
        <span className="testata-data">{country}</span>
      </header>

      <h2 className="titolone">
        {run.reached === 'vittoria' ? 'CAMPIONI DEL MONDO' : `FUORI AI ${TITOLI[run.reached]?.toUpperCase() ?? ''}`}
      </h2>
      <p className="sommario numero">
        {run.playerCaps} partite · {run.playerGoals} gol in maglia nazionale
      </p>

      <div className="tabellone">
        {fasi.map((fase) => {
          const partite = run.matches.filter((match) => match.stage === fase);
          if (partite.length === 0) return null;
          return (
            <div key={fase} className="tabellone-colonna">
              <span className="contesto-etichetta">{TITOLI[fase]}</span>
              {partite.map((match, indice) => (
                <div key={`${fase}-${indice}`} className="tie tie-mia">
                  <span className={match.homeGoals > match.awayGoals ? 'tie-vince' : ''}>
                    {match.home} <b className="numero">{match.homeGoals}</b>
                  </span>
                  <span className={match.awayGoals > match.homeGoals ? 'tie-vince' : ''}>
                    {match.away} <b className="numero">{match.awayGoals}</b>
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {run.reached === 'vittoria' && <p className="trofeo">🏆 {country} campione.</p>}
    </section>
  );
}
