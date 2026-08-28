import type { CareerResult } from './types';

/**
 * I traguardi: quello che resta quando una carriera è finita.
 *
 * Una carriera dura venti minuti e poi sparisce. I traguardi sono la ragione per
 * cominciarne un'altra: non chiedono di rifare la stessa cosa meglio, chiedono di
 * farne una diversa — restare vent'anni nella stessa città, o cambiarne otto,
 * segnare trecento gol o non prenderne mai.
 */
export interface Traguardo {
  id: string;
  title: string;
  text: string;
  /** Vero quando la carriera appena finita lo ha centrato. */
  check: (result: CareerResult) => boolean;
}

function golTotali(result: CareerResult): number {
  return result.seasons.reduce((somma, stagione) => somma + stagione.stats.goals, 0);
}

function assistTotali(result: CareerResult): number {
  return result.seasons.reduce((somma, stagione) => somma + stagione.stats.assists, 0);
}

function presenzeTotali(result: CareerResult): number {
  return result.seasons.reduce((somma, stagione) => somma + stagione.stats.appearances, 0);
}

/** Le stagioni consecutive nello stesso club. */
function stagioniNelloStessoClub(result: CareerResult): number {
  let massimo = 0;
  let corrente = 0;
  let precedente = '';
  for (const stagione of result.seasons) {
    corrente = stagione.clubId === precedente ? corrente + 1 : 1;
    precedente = stagione.clubId;
    massimo = Math.max(massimo, corrente);
  }
  return massimo;
}

export const TRAGUARDI: readonly Traguardo[] = [
  {
    id: 'centogol',
    title: 'Cento',
    text: 'Chiudi una carriera con almeno 100 gol.',
    check: (r) => golTotali(r) >= 100,
  },
  {
    id: 'trecentogol',
    title: 'Trecento',
    text: 'Chiudi una carriera con almeno 300 gol.',
    check: (r) => golTotali(r) >= 300,
  },
  {
    id: 'centoassist',
    title: 'L’ultimo passaggio',
    text: 'Chiudi una carriera con almeno 100 assist.',
    check: (r) => assistTotali(r) >= 100,
  },
  {
    id: 'cinquecentopresenze',
    title: 'Ferro',
    text: 'Arriva a 500 presenze in carriera.',
    check: (r) => presenzeTotali(r) >= 500,
  },
  {
    id: 'bandiera',
    title: 'Bandiera',
    text: 'Gioca dieci stagioni di fila nello stesso club.',
    check: (r) => stagioniNelloStessoClub(r) >= 10,
  },
  {
    id: 'giramondo',
    title: 'Giramondo',
    text: 'Vesti almeno otto maglie diverse.',
    check: (r) => r.clubsPlayed.length >= 8,
  },
  {
    id: 'scalata',
    title: 'La scalata',
    text: 'Parti sotto la seconda serie e arriva a giocare in massima serie.',
    check: (r) => {
      const primo = r.seasons[0]?.leagueLevel ?? 1;
      return primo >= 3 && r.seasons.some((stagione) => stagione.leagueLevel === 1);
    },
  },
  {
    id: 'continentale',
    title: 'La notte più lunga',
    text: 'Alza una coppa continentale.',
    check: (r) => r.trophies.some((trofeo) => trofeo.kind === 'continental'),
  },
  {
    id: 'seititoli',
    title: 'Ciclo',
    text: 'Vinci almeno sei campionati.',
    check: (r) => r.trophies.filter((trofeo) => trofeo.kind === 'league').length >= 6,
  },
  {
    id: 'premio',
    title: 'Il migliore',
    text: 'Vinci un premio individuale.',
    check: (r) => r.awards.length > 0,
  },
  {
    id: 'novanta',
    title: 'Fuoriclasse',
    text: 'Arriva a 90 di overall.',
    check: (r) => r.peakOverall >= 90,
  },
  {
    id: 'nazionale',
    title: 'La maglia della nazionale',
    text: 'Colleziona almeno 50 presenze in nazionale.',
    check: (r) => r.totalCaps >= 50,
  },
  {
    id: 'rivale',
    title: 'Meglio di lui',
    text: 'Chiudi la carriera davanti al tuo Rivale.',
    check: (r) => r.peakOverall > r.rival.peakOverall,
  },
  {
    id: 'goat',
    title: 'Leggenda',
    text: 'Chiudi una carriera sopra 700 punti GOAT.',
    check: (r) => r.goat.total >= 700,
  },
  {
    id: 'integro',
    title: 'Mai un graffio',
    text: 'Arriva al ritiro senza un solo infortunio grave.',
    check: (r) => r.seasons.length >= 12 && r.injuries.every((infortunio) => infortunio.severity !== 'grave'),
  },
];

/** Gli id dei traguardi centrati da questa carriera. */
export function traguardiDi(result: CareerResult): string[] {
  return TRAGUARDI.filter((traguardo) => traguardo.check(result)).map((traguardo) => traguardo.id);
}
