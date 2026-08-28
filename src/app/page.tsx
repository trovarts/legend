import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { dailyChallenge } from '../engine/challenge';
import { Albo } from '../ui/Albo';
import { Traguardi } from '../ui/Traguardi';
import type { LeagueSummary } from '../world/types';

/** Quanti campionati e quante squadre ci sono davvero: letto alla build, mai a mano. */
function ilMondo(): { campionati: number; club: number; paesi: number } {
  try {
    const index = JSON.parse(
      readFileSync(join(process.cwd(), 'public/world/index.json'), 'utf8'),
    ) as LeagueSummary[];
    return {
      campionati: index.length,
      club: index.reduce((somma, lega) => somma + lega.clubCount, 0),
      paesi: new Set(index.map((lega) => lega.country)).size,
    };
  } catch {
    return { campionati: 0, club: 0, paesi: 0 };
  }
}

export default function Home() {
  // La sfida cambia ogni giorno ed è la stessa per tutti: si calcola alla build,
  // e il sito è statico, quindi si aggiorna a ogni pubblicazione.
  const oggi = new Date().toISOString().slice(0, 10);
  const sfida = dailyChallenge(oggi);
  const mondo = ilMondo();

  return (
    <main className="home">
      <h1 className="marchio">LEGGENDA</h1>
      <p className="marchio-sotto">Il cammino verso la leggenda</p>

      <div className="modalita">
        <Link href="/gioca" className="modo modo-attivo">
          <span className="modo-nome">Solo</span>
          <span className="tenue">La tua carriera, dal vivaio al ritiro</span>
        </Link>
        <span className="modo modo-spento">
          <span className="modo-nome">Online</span>
          <span className="tenue">Sfida con amici · in arrivo</span>
        </span>
        <span className="modo modo-spento">
          <span className="modo-nome">Classifica</span>
          <span className="tenue">Il tabellone dei GOAT · in arrivo</span>
        </span>
      </div>

      <section className="sfida">
        <span className="contesto-etichetta">Sfida di oggi</span>
        <div className="riga" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginBottom: '.3rem' }}>{sfida.title}</h2>
            <p className="tenue" style={{ margin: 0 }}>{sfida.text}</p>
          </div>
          <div className="sfida-target">
            <b className="numero">{sfida.target}</b>
            <span>{sfida.unit}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="contesto-etichetta">Nuova carriera</span>
        <h2 style={{ fontSize: '2rem', margin: '.3rem 0 .4rem' }}>Sarai tu il predestinato?</h2>
        <p className="tenue">
          Si comincia a quattordici anni nel vivaio, con un agente che ci crede e una
          squadra vera. Da lì in poi decidi tu quanto rischiare.
        </p>
        <Link href="/gioca" className="bottone bottone-forte" style={{ marginTop: '.8rem' }}>
          Comincia dal vivaio
        </Link>
      </section>

      <Albo />
      <Traguardi />

      <p className="tenue" style={{ fontSize: '.78rem', textAlign: 'center', marginTop: '2rem' }}>
        {mondo.campionati} campionati veri in {mondo.paesi} nazioni · {mondo.club} squadre ·
        {' '}nessun account, nessuna installazione
      </p>
    </main>
  );
}
