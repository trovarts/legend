'use client';

import type { Agent } from '../engine/agent';
import { bandiera } from './bandiere';

const COLORI = ['agente-verde', 'agente-smeraldo', 'agente-viola', 'agente-ambra'];

function sigla(nome: string): string {
  const parole = nome.split(' ');
  return ((parole[0]?.[0] ?? '') + (parole[1]?.[0] ?? '')).toUpperCase();
}

/** La prima decisione della carriera: chi ti apre le porte, e quante. */
export function Agente({
  options,
  onChoose,
}: {
  options: readonly Agent[];
  onChoose: (id: string) => void;
}) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">INIZIO CARRIERA</span>
        <span className="testata-data">prima di tutto il resto</span>
      </header>
      <h2 className="titolone">Scegli il tuo agente</h2>
      <p className="sommario">
        Ti accompagnerà nelle trattative e cercherà le prime opportunità. Non lo cambierai facilmente.
      </p>

      <div className="scelte">
        {options.map((agent, index) => (
          <button
            key={agent.id}
            type="button"
            className={`scelta agente ${COLORI[index % COLORI.length]}`}
            onClick={() => onChoose(agent.id)}
          >
            <span className="scelta-stemma" aria-hidden="true">{sigla(agent.name)}</span>
            <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>{bandiera(agent.country)}</span>
            <span className="scelta-titolo">{agent.name}</span>
            <span className="stelle" aria-label={`${agent.stars} stelle su 5`}>
              {'★'.repeat(agent.stars)}
              <span className="stelle-spente">{'★'.repeat(5 - agent.stars)}</span>
            </span>
            <span className="scelta-nota">{agent.motto}</span>
            <span className="agente-dettagli">
              fino a {agent.maxOffers} offerte · club fino a OVR {agent.ceilingOverall} · reputazione{' '}
              {agent.reputation > 0 ? `+${agent.reputation.toFixed(1)}` : '+0'} · uscita con{' '}
              {agent.exitYears} anni residui
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
