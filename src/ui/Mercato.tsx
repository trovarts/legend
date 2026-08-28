'use client';

import type { Offer } from '../engine/types';
import { Scelta, Scelte, sigla } from './Scelte';

function soldi(valore: number): string {
  return valore >= 1_000_000 ? `${(valore / 1_000_000).toFixed(1)}M` : `${Math.round(valore / 1000)}K`;
}

export function Mercato({
  offers,
  clubName,
  onChoose,
}: {
  offers: readonly Offer[];
  clubName: string;
  onChoose: (clubId: string) => void;
}) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">MERCATO</span>
        <span className="testata-data">sessione estiva</span>
      </header>

      <h2 className="titolone">
        {offers.length === 0 ? 'Nessuno bussa alla porta' : `${offers.length} squadre ti vogliono`}
      </h2>
      <p className="sommario">
        {offers.length === 0
          ? `Quest'anno non arrivano offerte: si riparte da ${clubName}.`
          : 'Quanto giocheresti è la stima della società — ed è la stessa che il gioco userà per la tua stagione.'}
      </p>

      <Scelte>
        {offers.map((offer) => (
          <Scelta
            key={offer.clubId}
            sigla={sigla(offer.clubName)}
            titolo={offer.clubName}
            nota={`${offer.leagueName}${offer.isLoan ? ' · prestito' : ''} · ${soldi(offer.weeklyWageEur * 52)} l'anno`}
            badge={`giocheresti il ${Math.round(offer.expectedMinutesShare * 100)}%`}
            rischio={offer.expectedMinutesShare < 0.4}
            onClick={() => onChoose(offer.clubId)}
          />
        ))}
        <Scelta
          sigla={sigla(clubName)}
          titolo="Resta dove sei"
          nota={`Un altro anno con ${clubName}.`}
          badge="nessun cambiamento"
          onClick={() => onChoose('resta')}
        />
      </Scelte>
    </section>
  );
}
