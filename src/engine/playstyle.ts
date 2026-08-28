/**
 * Lo stile di gioco: come interpreti il tuo ruolo. Non cambia quanto sei forte,
 * cambia in che modo il tuo talento finisce nel tabellino.
 */
export type PlayStyle = 'equilibrato' | 'goleador' | 'rifinitore' | 'vincente';

export interface PlayStyleEffect {
  /** Moltiplicatori su quello che produci in campo. */
  goals: number;
  assists: number;
  /** Quanto pesa nel voto il risultato della squadra invece del tuo tabellino. */
  teamWeight: number;
}

export const PLAY_STYLES: readonly {
  id: PlayStyle;
  label: string;
  text: string;
}[] = [
  {
    id: 'equilibrato',
    label: 'Mentalità equilibrata',
    text: 'Sai fare di tutto: gol, gioco e sacrificio, senza estremi.',
  },
  {
    id: 'goleador',
    label: 'Punta ai gol',
    text: 'Sei un goleador nato: pensi alla porta prima di tutto.',
  },
  {
    id: 'rifinitore',
    label: 'Preferisci gli assist',
    text: 'Vivi per servire i compagni: l’ultimo passaggio è la tua firma.',
  },
  {
    id: 'vincente',
    label: 'Giochi per vincere',
    text: 'Il risultato conta più delle tue statistiche: vincere è l’unico obiettivo.',
  },
];

const EFFETTI: Record<PlayStyle, PlayStyleEffect> = {
  equilibrato: { goals: 1, assists: 1, teamWeight: 0 },
  goleador: { goals: 1.35, assists: 0.65, teamWeight: 0 },
  rifinitore: { goals: 0.7, assists: 1.5, teamWeight: 0 },
  vincente: { goals: 0.95, assists: 0.95, teamWeight: 0.35 },
};

export function playStyleEffect(style: PlayStyle): PlayStyleEffect {
  return EFFETTI[style];
}
