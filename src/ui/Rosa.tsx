'use client';

import { gerarchiaDelReparto, postiDaTitolare } from '../engine/playingTime';
import type { Role, WorldPlayer } from '../world/types';
import { Formazione } from './Formazione';

const REPARTI: readonly { role: Role; nome: string }[] = [
  { role: 'GK', nome: 'Portieri' },
  { role: 'DEF', nome: 'Difensori' },
  { role: 'MID', nome: 'Centrocampisti' },
  { role: 'FWD', nome: 'Attaccanti' },
];

function soldi(valore: number): string {
  if (valore >= 1_000_000) return `${(valore / 1_000_000).toFixed(1)}M`;
  if (valore >= 1000) return `${Math.round(valore / 1000)}K`;
  return `${valore}`;
}

/**
 * La rosa vera del club, reparto per reparto.
 *
 * Sono calciatori esistenti, con l'età e il valore che hanno: è la differenza fra
 * «gioco in una squadra di Serie A» e «gioco nel Napoli, e davanti a me c'è Lukaku».
 */
export function Rosa({
  squad,
  clubName,
  leagueName,
  playerName,
  overall,
  age,
  role,
  posizionePreferita,
}: {
  squad: readonly WorldPlayer[];
  clubName: string;
  leagueName: string;
  playerName: string;
  overall: number;
  age: number;
  role: Role;
  posizionePreferita: string;
}) {
  if (squad.length === 0) {
    return <p className="tenue">La rosa non è ancora stata caricata.</p>;
  }

  return (
    <>
    <Formazione
      squad={squad}
      playerName={playerName}
      overall={overall}
      age={age}
      role={role}
      posizionePreferita={posizionePreferita}
    />

    <section className="card">
      <h2 style={{ marginBottom: '.1rem' }}>{clubName}</h2>
      <p className="tenue" style={{ margin: '0 0 .6rem', fontSize: '.85rem' }}>
        {leagueName} · {squad.length + 1} in rosa, te compreso
      </p>

      {REPARTI.map((reparto) => {
        const tuo = reparto.role === role;
        const fila = tuo
          ? gerarchiaDelReparto({ name: playerName, overall, age, role }, squad)
          : squad
              .filter((mate) => mate.role === reparto.role)
              .sort((a, b) => b.overall - a.overall)
              .map((mate, indice) => ({
                name: mate.name, overall: mate.overall, age: mate.age,
                mine: false, starter: indice < postiDaTitolare(reparto.role),
              }));

        if (fila.length === 0) return null;

        return (
          <div key={reparto.role} style={{ marginBottom: '.7rem' }}>
            <span className="contesto-etichetta">
              {reparto.nome} · {postiDaTitolare(reparto.role)} in campo
            </span>
            <div className="gerarchia" style={{ marginTop: '.3rem' }}>
              {fila.map((posto, indice) => {
                const vero = squad.find((mate) => mate.name === posto.name);
                return (
                  <div
                    key={`${posto.name}-${indice}`}
                    className={`gerarchia-riga${posto.mine ? ' gerarchia-mia' : ''}${posto.starter ? ' gerarchia-titolare' : ''}`}
                  >
                    <span className="gerarchia-posto numero">{indice + 1}</span>
                    <span className="gerarchia-nome">{posto.name}</span>
                    <span className="tenue numero" style={{ fontSize: '.72rem' }}>
                      {posto.age} anni{vero && vero.valueEur > 0 ? ` · ${soldi(vero.valueEur)}` : ''}
                    </span>
                    <span className="gerarchia-ovr numero">{posto.overall}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
    </>
  );
}
