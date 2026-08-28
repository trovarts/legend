import { createRng } from './rng';

/** La sfida del giorno: uguale per tutti, cambia a mezzanotte. */
export interface DailyChallenge {
  id: string;
  title: string;
  text: string;
  target: number;
  unit: string;
}

const SFIDE: readonly Omit<DailyChallenge, 'id'>[] = [
  { title: 'Bomber da 300', text: 'Chiudi una carriera con almeno 300 gol totali.', target: 300, unit: 'gol' },
  { title: 'Uomo squadra', text: 'Chiudi una carriera con almeno 150 assist.', target: 150, unit: 'assist' },
  { title: 'Bandiera', text: 'Gioca almeno 12 stagioni con lo stesso club.', target: 12, unit: 'stagioni' },
  { title: 'Giramondo', text: 'Vesti almeno 8 maglie diverse in carriera.', target: 8, unit: 'club' },
  { title: 'Dalla gavetta', text: 'Parti dalla quarta divisione e chiudi sopra 800 punti GOAT.', target: 800, unit: 'punti' },
  { title: 'Ferro', text: 'Arriva a 700 presenze in carriera.', target: 700, unit: 'presenze' },
  { title: 'Il predestinato', text: 'Raggiungi 90 di overall prima dei 25 anni.', target: 90, unit: 'overall' },
];

/**
 * La sfida di oggi, ricavata dalla data: tutti quelli che giocano oggi hanno la stessa,
 * e nessuno deve stare a sincronizzare niente.
 */
export function dailyChallenge(giorno: string): DailyChallenge {
  let hash = 0;
  for (const carattere of giorno) hash = (hash * 31 + carattere.charCodeAt(0)) >>> 0;
  const rng = createRng(hash);
  const scelta = SFIDE[rng.int(0, SFIDE.length - 1)]!;
  return { ...scelta, id: `${giorno}-${scelta.title}` };
}
