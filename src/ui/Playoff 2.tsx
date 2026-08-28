'use client';

import type { PlayoffBracket } from '../engine/promotion';

export function Playoff({ bracket }: { bracket: PlayoffBracket }) {
  const semifinali = bracket.ties.filter((tie) => tie.round === 'semifinale');
  const finale = bracket.ties.find((tie) => tie.round === 'finale');

  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">PLAYOFF PROMOZIONE</span>
        <span className="testata-data">{bracket.leagueName}</span>
      </header>

      <h2 className="titolone">{bracket.promoted ? 'SI SALE' : 'RESTA TUTTO COM’È'}</h2>
      <p className="sommario">
        {bracket.promoted
          ? `${bracket.winner} conquista la promozione: l'anno prossimo si gioca più in alto.`
          : `${bracket.winner} sale di categoria. Per noi un altro anno quaggiù.`}
      </p>

      <div className="tabellone">
        <div className="tabellone-colonna">
          <span className="contesto-etichetta">Semifinali</span>
          {semifinali.map((tie, indice) => (
            <div key={indice} className={`tie${tie.playerInvolved ? ' tie-mia' : ''}`}>
              <span className={tie.homeGoals > tie.awayGoals ? 'tie-vince' : ''}>
                {tie.home} <b className="numero">{tie.homeGoals}</b>
              </span>
              <span className={tie.awayGoals > tie.homeGoals ? 'tie-vince' : ''}>
                {tie.away} <b className="numero">{tie.awayGoals}</b>
              </span>
            </div>
          ))}
        </div>
        {finale && (
          <div className="tabellone-colonna">
            <span className="contesto-etichetta">Finale</span>
            <div className={`tie${finale.playerInvolved ? ' tie-mia' : ''}`}>
              <span className={finale.homeGoals > finale.awayGoals ? 'tie-vince' : ''}>
                {finale.home} <b className="numero">{finale.homeGoals}</b>
              </span>
              <span className={finale.awayGoals > finale.homeGoals ? 'tie-vince' : ''}>
                {finale.away} <b className="numero">{finale.awayGoals}</b>
              </span>
            </div>
          </div>
        )}
      </div>

      {bracket.promoted && <p className="trofeo">⬆ Promossi.</p>}
    </section>
  );
}
