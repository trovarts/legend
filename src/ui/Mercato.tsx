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
            sottotitolo={`${offer.leagueName}${offer.isLoan ? ' · prestito' : ''}`}
            nota={`${soldi(offer.weeklyWageEur * 52)} l'anno${offer.isLoan ? '' : ` · cartellino ${soldi(offer.feeEur)}`}`}
            etichetta={offer.expectedMinutesShare < 0.4 ? 'rischi la panchina' : 'giocheresti'}
            sicura={offer.expectedMinutesShare >= 0.6}
            puntata={
              <span className="puntata">
                <span className={`faccia faccia-${offer.expectedMinutesShare >= 0.5 ? 'bene' : 'male'}`}>
                  <b className="faccia-quota">minuti attesi</b>
                  <span className="faccia-esito">{Math.round(offer.expectedMinutesShare * 100)}%</span>
                </span>
              </span>
            }
            onClick={() => onChoose(offer.clubId)}
          />
        ))}
        <Scelta
          sigla={sigla(clubName)}
          titolo="Resta dove sei"
          nota={`Un altro anno con ${clubName}.`}
          etichetta="esito certo"
          sicura
          puntata={
            <span className="puntata">
              <span className="faccia faccia-neutro">
                <span className="faccia-esito">niente cambia</span>
              </span>
            </span>
          }
          onClick={() => onChoose('resta')}
        />
      </Scelte>
    </section>
  );
}
