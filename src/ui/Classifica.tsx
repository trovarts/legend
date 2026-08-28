'use client';

import type { StandingRow } from '../engine/standings';

export function Classifica({ rows, leagueName }: { rows: readonly StandingRow[]; leagueName: string }) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">CLASSIFICA</span>
        <span className="testata-data">{leagueName}</span>
      </header>
      <div className="tabella">
        {rows.map((row, index) => (
          <div key={row.clubId} className={`tabella-riga${row.isPlayer ? ' tabella-mia' : ''}`}>
            <span className="numero tabella-pos">{index + 1}</span>
            <span className="tabella-club">{row.clubName}</span>
            <span className="tabella-ovr numero">{row.strength.toFixed(0)}</span>
            <span className="numero tenue">{row.goalDifference > 0 ? '+' : ''}{row.goalDifference}</span>
            <span className="numero tabella-punti">{row.points}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
