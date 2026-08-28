import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { dailyChallenge } from '../engine/challenge';
import { Albo } from '../ui/Albo';
import { Sfida } from '../ui/Sfida';
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
          <span className="modo-nome">Gioca</span>
          <span className="tenue">La tua carriera, dal vivaio al ritiro</span>
        </Link>
        <a href="#albo" className="modo">
          <span className="modo-nome">Albo</span>
          <span className="tenue">Le tue carriere migliori</span>
        </a>
        <a href="#traguardi" className="modo">
          <span className="modo-nome">Traguardi</span>
          <span className="tenue">Quello che resta fra una carriera e l&apos;altra</span>
        </a>
      </div>

      <Sfida sfida={sfida} oggi={oggi} />

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

      <section className="dentro">
        <span className="contesto-etichetta">Cosa c&apos;è dentro</span>
        <ul className="dentro-elenco">
          <li><b>{mondo.campionati}</b> campionati veri in {mondo.paesi} nazioni, {mondo.club} squadre con le rose vere</li>
          <li><b>Quattro divisioni</b> per paese: promozioni, retrocessioni, playoff, coppe nazionali e continentali</li>
          <li><b>Venticinque bivi</b> con la posta dichiarata, e i Segni che restano addosso per anni</li>
          <li><b>Un Rivale</b> che gioca la sua carriera accanto alla tua per vent&apos;anni</li>
          <li><b>Un&apos;ambizione</b> da scegliere prima di cominciare, e un manifesto da mandare a chi ti sfida</li>
        </ul>
      </section>

      <div id="albo"><Albo /></div>
      <div id="traguardi"><Traguardi /></div>

      <p className="tenue" style={{ fontSize: '.78rem', textAlign: 'center', marginTop: '2rem' }}>
        {mondo.campionati} campionati veri in {mondo.paesi} nazioni · {mondo.club} squadre ·
        {' '}nessun account, nessuna installazione
      </p>
    </main>
  );
}
