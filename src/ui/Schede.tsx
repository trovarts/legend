'use client';

import type { Agent } from '../engine/agent';
import type { CareerResult, SeasonRecord, Trophy } from '../engine/types';
import type { YouthSeason } from '../engine/youth';

export type Scheda = 'carriera' | 'profilo' | 'agente' | 'statistiche' | 'bacheca';

export const SCHEDE: readonly { id: Scheda; label: string }[] = [
  { id: 'profilo', label: 'Profilo' },
  { id: 'agente', label: 'Agente' },
  { id: 'carriera', label: 'Carriera' },
  { id: 'statistiche', label: 'Statistiche' },
  { id: 'bacheca', label: 'Bacheca' },
];

export function BarraSchede({
  attiva,
  onChange,
}: {
  attiva: Scheda;
  onChange: (scheda: Scheda) => void;
}) {
  return (
    <nav className="schede" aria-label="Sezioni della carriera">
      {SCHEDE.map((scheda) => (
        <button
          key={scheda.id}
          type="button"
          className={`scheda${attiva === scheda.id ? ' scheda-attiva' : ''}`}
          onClick={() => onChange(scheda.id)}
          aria-current={attiva === scheda.id}
        >
          {scheda.label}
        </button>
      ))}
    </nav>
  );
}

function soldi(valore: number): string {
  return valore >= 1_000_000 ? `${(valore / 1_000_000).toFixed(1)}M` : `${Math.round(valore / 1000)}K`;
}

export function Profilo({
  name,
  position,
  style,
  seasons,
  youth,
}: {
  name: string;
  position: string;
  style: string;
  seasons: readonly SeasonRecord[];
  youth: readonly YouthSeason[];
}) {
  const ultima = seasons[seasons.length - 1];
  const primo = youth[0];

  return (
    <section className="card">
      <h2>{name}</h2>
      <div className="riga tenue"><span>Ruolo</span><span>{position}</span></div>
      <div className="riga tenue"><span>Come gioca</span><span>{style}</span></div>
      <div className="riga tenue"><span>Cresciuto a</span><span>{primo?.clubName ?? '—'}</span></div>
      <div className="riga tenue"><span>Anni di vivaio</span><span className="numero">{youth.length}</span></div>
      <div className="riga tenue"><span>Stagioni da professionista</span><span className="numero">{seasons.length}</span></div>
      {ultima && (
        <>
          <div className="riga tenue"><span>Club attuale</span><span>{ultima.clubName}</span></div>
          <div className="riga tenue"><span>Valore</span><span className="numero">{soldi(ultima.valueEur)}</span></div>
          <div className="riga tenue">
            <span>Segni addosso</span>
            <span>{ultima.marks.length === 0 ? 'nessuno' : ultima.marks.map((m) => m.id.replace(/-/g, ' ')).join(', ')}</span>
          </div>
        </>
      )}
    </section>
  );
}

export function SchedaAgente({ agent, offerte }: { agent: Agent | null; offerte: number }) {
  if (!agent) return <section className="card"><p className="tenue">Nessun agente, per ora.</p></section>;
  return (
    <section className="card">
      <h2>{agent.name}</h2>
      <p className="stelle">
        {'★'.repeat(agent.stars)}<span className="stelle-spente">{'★'.repeat(5 - agent.stars)}</span>
      </p>
      <p className="tenue">{agent.motto}</p>
      <div className="riga tenue"><span>Offerte per sessione</span><span className="numero">fino a {agent.maxOffers}</span></div>
      <div className="riga tenue"><span>Arriva a club fino a</span><span className="numero">OVR {agent.ceilingOverall}</span></div>
      <div className="riga tenue"><span>Ti fa partire con</span><span className="numero">{agent.exitYears} anni residui</span></div>
      <div className="riga tenue"><span>Offerte portate finora</span><span className="numero">{offerte}</span></div>
    </section>
  );
}

export function Statistiche({ seasons }: { seasons: readonly SeasonRecord[] }) {
  const totali = seasons.reduce(
    (somma, stagione) => ({
      presenze: somma.presenze + stagione.stats.appearances,
      gol: somma.gol + stagione.stats.goals,
      assist: somma.assist + stagione.stats.assists,
      cleanSheet: somma.cleanSheet + stagione.stats.cleanSheets,
      minuti: somma.minuti + stagione.stats.minutes,
      caps: somma.caps + stagione.national.caps,
    }),
    { presenze: 0, gol: 0, assist: 0, cleanSheet: 0, minuti: 0, caps: 0 },
  );

  return (
    <section className="card">
      <h2>In carriera</h2>
      <div className="vivaio-caselle" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {([
          ['PRESENZE', totali.presenze],
          ['GOL', totali.gol],
          ['ASSIST', totali.assist],
          ['MINUTI', totali.minuti],
          ['CLEAN SHEET', totali.cleanSheet],
          ['NAZIONALE', totali.caps],
        ] as const).map(([nome, valore]) => (
          <div key={nome} className="vivaio-casella">
            <span className="contesto-etichetta">{nome}</span>
            <b className="numero">{valore}</b>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: '1rem' }}>Stagione per stagione</h3>
      <div className="tabella">
        {[...seasons].reverse().map((stagione) => (
          <div key={stagione.season} className="tabella-riga" style={{ gridTemplateColumns: '2.4rem 1fr auto auto auto' }}>
            <span className="numero tabella-pos">{stagione.age}</span>
            <span className="tabella-club">{stagione.clubName}</span>
            <span className="numero tenue">{stagione.stats.appearances}p</span>
            <span className="numero tenue">{stagione.stats.goals}g</span>
            <span className="numero tabella-punti">{stagione.overallEnd}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Bacheca({ result, seasons }: { result: CareerResult | null; seasons: readonly SeasonRecord[] }) {
  const trofei: Trophy[] = result?.trophies ?? seasons.flatMap((stagione) => stagione.trophies);
  const premi = result?.awards ?? seasons.flatMap((stagione) => stagione.awards);

  const perTipo = new Map<string, number>();
  for (const trofeo of trofei) {
    perTipo.set(trofeo.competitionName, (perTipo.get(trofeo.competitionName) ?? 0) + 1);
  }

  return (
    <section className="card">
      <h2>Bacheca</h2>
      {perTipo.size === 0 && premi.length === 0 ? (
        <p className="tenue">Ancora vuota. C&apos;è tempo.</p>
      ) : (
        <>
          {[...perTipo.entries()].map(([nome, quante]) => (
            <div key={nome} className="riga">
              <span>🏆 {nome}</span>
              <span className="numero">×{quante}</span>
            </div>
          ))}
          {premi.length > 0 && (
            <div className="riga">
              <span>🎖 Premi individuali</span>
              <span className="numero">×{premi.length}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
