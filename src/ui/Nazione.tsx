'use client';

import { competitionsOf } from '../engine/competitionsMap';
import type { LeagueSummary } from '../world/types';
import { bandiera, inItaliano } from './bandiere';
import { usaPortaInVista } from './portaInVista';

/**
 * La scheda del paese scelto sulla mappa.
 *
 * Prima di firmare da qualche parte vuoi sapere dove stai andando: quante squadre
 * ci sono, quante divisioni, che coppa si gioca, quanto vale il movimento. È la
 * differenza fra scegliere una bandiera e scegliere un paese.
 */
export function Nazione({
  country,
  leagues,
  onConfirm,
}: {
  country: string;
  leagues: readonly LeagueSummary[];
  onConfirm: () => void;
}) {
  /*
   * Sul telefono la scheda nasceva mille pixel piu' in basso: toccavi un paese e non
   * succedeva niente di visibile. Adesso viene lei da te.
   */
  const carta = usaPortaInVista<HTMLDivElement>();
  const mie = leagues.filter((league) => league.country === country).sort((a, b) => a.level - b.level);
  const club = mie.reduce((somma, league) => somma + league.clubCount, 0);
  const competizioni = competitionsOf(country);
  const divisioni = new Set(mie.map((league) => league.level)).size;

  return (
    <div className="card nazione" ref={carta}>
      <div className="nazione-testa">
        <span className="nazione-bandiera" aria-hidden="true">{bandiera(country)}</span>
        <span>
          <strong className="nazione-nome">{inItaliano(country).toUpperCase()}</strong>
          <span className="nazione-riga">
            {club} club · {competizioni.continent} · Ranking {competizioni.ranking}° · {competizioni.points} pt
          </span>
        </span>
      </div>

      <div className="nazione-blocchi">
        <div className="nazione-blocco">
          <span className="contesto-etichetta">Campionati · {divisioni} divisioni</span>
          {mie.map((league) => (
            <span key={league.id} className="nazione-voce">
              <b>{league.level}</b> {league.name}
              <span className="tenue"> · {league.clubCount}</span>
            </span>
          ))}
        </div>

        <div className="nazione-blocco">
          <span className="contesto-etichetta">Coppe</span>
          <span className="nazione-voce">🏆 {competizioni.cup}</span>
          <span className="nazione-voce">
            ⭐ {competizioni.continental.prima}
            <span className="tenue"> · {competizioni.spots.prima} posti</span>
          </span>
          <span className="nazione-voce">
            ✦ {competizioni.continental.seconda}
            <span className="tenue"> · {competizioni.spots.seconda}</span>
          </span>
          <span className="nazione-voce">
            ▫ {competizioni.continental.terza}
            <span className="tenue"> · {competizioni.spots.terza}</span>
          </span>
        </div>

        <div className="nazione-blocco">
          <span className="contesto-etichetta">Nazionale</span>
          <span className="nazione-voce">🌍 Mondiale</span>
          <span className="nazione-voce">🏅 {competizioni.national.major}</span>
          <span className="nazione-voce">🎯 {competizioni.national.minor}</span>
        </div>
      </div>

      <button type="button" className="avanti" onClick={onConfirm}>
        <span>Comincio da {inItaliano(country)}</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
