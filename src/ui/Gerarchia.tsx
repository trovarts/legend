'use client';

import { gerarchiaDelReparto, postiDaTitolare } from '../engine/playingTime';
import type { Role, WorldPlayer } from '../world/types';

const NOMI_REPARTO: Record<Role, string> = {
  GK: 'porta',
  DEF: 'difesa',
  MID: 'centrocampo',
  FWD: 'attacco',
};

/**
 * La fila davanti a te, con nome e cognome.
 *
 * «Giochi il 34% dei minuti» non dice niente. «Davanti a te c'è Meret, 79» dice tutto:
 * sai chi devi superare, e quando l'anno dopo non c'è più lo senti.
 */
export function Gerarchia({
  playerName,
  overall,
  age,
  role,
  squad,
  clubName,
}: {
  playerName: string;
  overall: number;
  age: number;
  role: Role;
  squad: readonly WorldPlayer[];
  clubName: string;
}) {
  if (squad.length === 0) return null;

  const fila = gerarchiaDelReparto({ name: playerName, overall, age, role }, squad).slice(0, 7);
  const posti = postiDaTitolare(role);
  const mio = fila.findIndex((posto) => posto.mine);
  const davanti = fila.filter((posto) => !posto.mine && posto.overall > overall).length;

  return (
    <div className="card">
      <span className="contesto-etichetta">
        In {NOMI_REPARTO[role]} · {clubName} · {posti} {posti === 1 ? 'posto' : 'posti'} da titolare
      </span>
      <p className="tenue" style={{ margin: '.25rem 0 .5rem', fontSize: '.85rem' }}>
        {mio < posti
          ? 'Il posto è tuo: da qui si difende.'
          : davanti === 1
            ? 'Uno solo ti separa dalla maglia da titolare.'
            : `Ce ne sono ${davanti} davanti a te.`}
      </p>
      <div className="gerarchia">
        {fila.map((posto, indice) => (
          <div
            key={`${posto.name}-${indice}`}
            className={`gerarchia-riga${posto.mine ? ' gerarchia-mia' : ''}${posto.starter ? ' gerarchia-titolare' : ''}`}
          >
            <span className="gerarchia-posto numero">{indice + 1}</span>
            <span className="gerarchia-nome">{posto.name}</span>
            <span className="tenue numero" style={{ fontSize: '.75rem' }}>{posto.age} anni</span>
            <span className="gerarchia-ovr numero">{posto.overall}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
