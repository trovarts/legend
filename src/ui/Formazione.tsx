'use client';

import { gerarchiaDelReparto, postiDaTitolare } from '../engine/playingTime';
import type { Role, WorldPlayer } from '../world/types';
import { POSIZIONI } from './Campo';

/** Quale casella del campo tocca al titolare numero `indice` di quel reparto. */
const CASELLE: Record<Role, readonly string[]> = {
  GK: ['GK'],
  DEF: ['CB', 'LB', 'RB', 'CDM'],
  MID: ['CM', 'CAM', 'LM', 'RM'],
  FWD: ['ST', 'LW'],
};

interface InCampo {
  posizione: string;
  nome: string;
  overall: number;
  mio: boolean;
}

/**
 * L'undici che scende in campo, con te dentro se il posto te lo sei preso.
 *
 * Il numero dei minuti dice quanto giochi; il campo dice **dove**, e accanto a chi.
 * Sono compagni veri, con l'overall che hanno: è la differenza fra un simulatore e
 * un foglio di calcolo con sopra un pallone.
 */
export function Formazione({
  squad,
  playerName,
  overall,
  age,
  role,
  posizionePreferita,
}: {
  squad: readonly WorldPlayer[];
  playerName: string;
  overall: number;
  age: number;
  role: Role;
  posizionePreferita: string;
}) {
  if (squad.length < 11) return null;

  const undici: InCampo[] = [];
  let dentro = false;

  for (const reparto of ['GK', 'DEF', 'MID', 'FWD'] as const) {
    const posti = postiDaTitolare(reparto);
    const caselle = CASELLE[reparto];

    const fila =
      reparto === role
        ? gerarchiaDelReparto({ name: playerName, overall, age, role }, squad)
        : squad
            .filter((mate) => mate.role === reparto)
            .sort((a, b) => b.overall - a.overall)
            .map((mate) => ({ name: mate.name, overall: mate.overall, age: mate.age, mine: false, starter: true }));

    fila.slice(0, posti).forEach((posto, indice) => {
      if (posto.mine) dentro = true;
      // Il giocatore prende la casella che ha scelto alla creazione, se è del suo reparto.
      const suaCasella =
        posto.mine && caselle.includes(posizionePreferita) ? posizionePreferita : undefined;
      undici.push({
        posizione: suaCasella ?? caselle[indice] ?? caselle[0]!,
        nome: posto.name,
        overall: posto.overall,
        mio: posto.mine,
      });
    });
  }

  // Se il giocatore ha preso una casella già occupata, l'altro si sposta.
  const usate = new Set<string>();
  for (const posto of [...undici].sort((a, b) => Number(b.mio) - Number(a.mio))) {
    if (!usate.has(posto.posizione)) {
      usate.add(posto.posizione);
      continue;
    }
    const libera = POSIZIONI.find(
      (p) => p.role === (squad.find((m) => m.name === posto.nome)?.role ?? 'MID') && !usate.has(p.id),
    );
    posto.posizione = libera?.id ?? posto.posizione;
    usate.add(posto.posizione);
  }

  return (
    <div className="card">
      <span className="contesto-etichetta">
        L&apos;undici titolare {dentro ? '· ci sei anche tu' : '· tu parti dalla panchina'}
      </span>
      <div className="campo formazione" role="img" aria-label="L'undici titolare">
        <div className="campo-erba" aria-hidden="true">
          <span className="campo-linea" />
          <span className="campo-cerchio" />
          <span className="campo-area campo-area-alta" />
          <span className="campo-area campo-area-bassa" />
        </div>
        {undici.map((posto) => {
          const dove = POSIZIONI.find((p) => p.id === posto.posizione) ?? POSIZIONI[0]!;
          return (
            <span
              key={`${posto.posizione}-${posto.nome}`}
              className={`in-campo${posto.mio ? ' in-campo-mio' : ''}`}
              style={{ left: `${dove.x}%`, top: `${dove.y}%` }}
            >
              <b className="in-campo-ovr numero">{posto.overall}</b>
              <span className="in-campo-nome">{posto.nome}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
