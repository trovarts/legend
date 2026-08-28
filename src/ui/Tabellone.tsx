'use client';

import { usaPortaInVista } from './portaInVista';

import type { CupBracket, CupRound } from '../engine/cup';

const TITOLI: Record<CupRound, string> = {
  quarti: 'Quarti',
  semifinale: 'Semifinale',
  finale: 'Finale',
};

export function Tabellone({ bracket }: { bracket: CupBracket }) {
  // Il proprio accoppiamento si porta sotto gli occhi da solo.
  const mia = usaPortaInVista<HTMLDivElement>();

  const turni: CupRound[] = ['quarti', 'semifinale', 'finale'];

  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">{bracket.name.toUpperCase()}</span>
        <span className="testata-data">
          {bracket.reached === 'vittoria' ? 'trofeo alzato' : `fuori a: ${bracket.reached}`}
        </span>
      </header>

      <div className="tabellone">
        {turni.map((turno) => {
          const partite = bracket.ties.filter((tie) => tie.round === turno);
          if (partite.length === 0) return null;
          return (
            <div key={turno} className="tabellone-colonna">
              <span className="contesto-etichetta">{TITOLI[turno]}</span>
              {partite.map((tie, index) => (
                <div
                  key={`${turno}-${index}`}
                  ref={tie.playerInvolved ? mia : undefined}
                  className={`tie${tie.playerInvolved ? ' tie-mia' : ''}`}
                >
                  <span className={tie.homeGoals > tie.awayGoals ? 'tie-vince' : ''}>
                    {tie.home} <b className="numero">{tie.homeGoals}</b>
                  </span>
                  <span className={tie.awayGoals > tie.homeGoals ? 'tie-vince' : ''}>
                    {tie.away} <b className="numero">{tie.awayGoals}</b>
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {bracket.reached === 'vittoria' && (
        <p className="trofeo">🏆 {bracket.winner} alza la coppa.</p>
      )}
    </section>
  );
}
