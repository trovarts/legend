'use client';

import type { Role } from '../world/types';

/** Le posizioni sul campo, come le direbbe un allenatore. */
export interface Posizione {
  id: string;
  role: Role;
  label: string;
  text: string;
  /** In percentuale sul campo disegnato. */
  x: number;
  y: number;
}

export const POSIZIONI: readonly Posizione[] = [
  { id: 'ST', role: 'FWD', label: 'Attaccante', text: 'Vivi per il gol: ti giudicheranno su quelli, stagione dopo stagione.', x: 50, y: 12 },
  { id: 'LW', role: 'FWD', label: 'Ala sinistra', text: 'Salti l’uomo e metti in mezzo: gol e assist, in parti uguali.', x: 20, y: 22 },
  { id: 'RW', role: 'FWD', label: 'Ala destra', text: 'Salti l’uomo e metti in mezzo: gol e assist, in parti uguali.', x: 80, y: 22 },
  { id: 'CAM', role: 'MID', label: 'Trequartista', text: 'L’ultimo passaggio passa da te: sei tu a inventare.', x: 50, y: 33 },
  { id: 'LM', role: 'MID', label: 'Esterno sinistro', text: 'Corri su e giù per novanta minuti, e nessuno se ne accorge.', x: 16, y: 45 },
  { id: 'CM', role: 'MID', label: 'Centrocampista', text: 'Il gioco passa da te, nel bene e nel male.', x: 50, y: 45 },
  { id: 'RM', role: 'MID', label: 'Esterno destro', text: 'Corri su e giù per novanta minuti, e nessuno se ne accorge.', x: 84, y: 45 },
  { id: 'CDM', role: 'MID', label: 'Mediano', text: 'Rompi il gioco degli altri: lavoro sporco, poche copertine.', x: 50, y: 57 },
  { id: 'LB', role: 'DEF', label: 'Terzino sinistro', text: 'Difendi e spingi: la fascia è tutta tua.', x: 16, y: 70 },
  { id: 'CB', role: 'DEF', label: 'Difensore centrale', text: 'Ti giudicano su quello che non succede.', x: 50, y: 70 },
  { id: 'RB', role: 'DEF', label: 'Terzino destro', text: 'Difendi e spingi: la fascia è tutta tua.', x: 84, y: 70 },
  { id: 'GK', role: 'GK', label: 'Portiere', text: 'Un posto solo, e te lo devi prendere. Ti misurano su parate e porta inviolata.', x: 50, y: 88 },
];

export function posizioneById(id: string): Posizione {
  return POSIZIONI.find((posizione) => posizione.id === id) ?? POSIZIONI[0]!;
}

/** Il campo su cui si sceglie il ruolo, invece di quattro voci in un elenco. */
export function Campo({
  scelta,
  onChoose,
}: {
  scelta: string;
  onChoose: (id: string) => void;
}) {
  return (
    <div className="campo" role="group" aria-label="Scegli la posizione in campo">
      <div className="campo-erba" aria-hidden="true">
        <span className="campo-linea" />
        <span className="campo-cerchio" />
        <span className="campo-area campo-area-alta" />
        <span className="campo-area campo-area-bassa" />
      </div>
      {POSIZIONI.map((posizione) => (
        <button
          key={posizione.id}
          type="button"
          className={`ruolo${scelta === posizione.id ? ' ruolo-scelto' : ''}`}
          style={{ left: `${posizione.x}%`, top: `${posizione.y}%` }}
          onClick={() => onChoose(posizione.id)}
          aria-label={posizione.label}
          aria-pressed={scelta === posizione.id}
        >
          {posizione.id}
        </button>
      ))}
    </div>
  );
}
