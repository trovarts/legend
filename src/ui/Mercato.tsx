'use client';

import type { Offer } from '../engine/types';

function soldi(valore: number): string {
  return valore >= 1_000_000
    ? `${(valore / 1_000_000).toFixed(1)}M`
    : `${Math.round(valore / 1000)}K`;
}

export function Mercato({
  offers,
  onChoose,
}: {
  offers: readonly Offer[];
  onChoose: (clubId: string) => void;
}) {
  return (
    <div className="card">
      <h2>Mercato</h2>
      {offers.length === 0 ? (
        <p className="tenue">Nessuna offerta quest&apos;anno. Si continua da dove eravamo.</p>
      ) : (
        <p className="tenue">
          Quanto giocheresti è una stima della società — ed è la stessa che il gioco userà
          per calcolare la tua stagione.
        </p>
      )}

      {offers.map((offer) => (
        <button
          key={offer.clubId}
          type="button"
          className="bottone"
          style={{ marginTop: '.6rem' }}
          onClick={() => onChoose(offer.clubId)}
        >
          <strong>{offer.clubName}</strong> — {offer.leagueName}
          {offer.isLoan && ' (prestito)'}
          <span className="posta">
            Giocheresti circa il {Math.round(offer.expectedMinutesShare * 100)}% dei minuti
            {!offer.isLoan && ` · cartellino ${soldi(offer.feeEur)}`}
            {` · ingaggio ${soldi(offer.weeklyWageEur * 52)} l'anno`}
          </span>
        </button>
      ))}

      <button
        type="button"
        className="bottone bottone-forte"
        style={{ marginTop: '.9rem' }}
        onClick={() => onChoose('resta')}
      >
        Resta dove sei
      </button>
    </div>
  );
}
