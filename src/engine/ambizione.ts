import type { SeasonRecord } from './types';

/**
 * L'ambizione: cosa vuoi che questa carriera sia.
 *
 * Il punteggio GOAT dice quanto sei stato bravo. L'ambizione dice cosa hai provato a
 * fare, e si sceglie prima di cominciare: è la differenza fra giocare vent'anni e
 * raccontare una storia. Non tocca la simulazione — cambia solo cosa conta come
 * riuscita, e per questo si può scegliere senza rovinare la carriera di nessuno.
 */
export type AmbizioneId = 'nessuna' | 'predestinato' | 'bandiera' | 'giramondo' | 'dal-nulla' | 'trofei';

export interface Ambizione {
  id: AmbizioneId;
  titolo: string;
  /** La promessa, come la diresti a un amico. */
  testo: string;
  /** Quanto serve per centrarla. */
  target: number;
  unita: string;
  /** Punti GOAT in più se la centri: vale quanto costa. */
  premio: number;
}

export const AMBIZIONI: readonly Ambizione[] = [
  {
    id: 'nessuna',
    titolo: 'Nessuna promessa',
    testo: 'Vedi dove ti porta. Nessun bonus, nessun vincolo.',
    target: 0,
    unita: '',
    premio: 0,
  },
  {
    id: 'predestinato',
    titolo: 'Il predestinato',
    testo: 'Arrivare a 90 di overall. Il talento non basta: serve giocare, sempre.',
    target: 90,
    unita: 'overall',
    premio: 60,
  },
  {
    id: 'bandiera',
    titolo: 'La bandiera',
    testo: 'Dodici stagioni con la stessa maglia. Rinunciare a tutte le altre.',
    target: 12,
    unita: 'stagioni di fila',
    premio: 55,
  },
  {
    id: 'giramondo',
    titolo: 'Il giramondo',
    testo: 'Giocare in quattro paesi diversi. Ricominciare ogni volta da capo.',
    target: 4,
    unita: 'paesi',
    premio: 45,
  },
  {
    id: 'dal-nulla',
    titolo: 'Dal nulla',
    testo: 'Partire sotto la seconda serie e vincere un campionato di massima serie.',
    target: 1,
    unita: 'titolo in massima serie',
    premio: 80,
  },
  {
    id: 'trofei',
    titolo: 'La bacheca',
    testo: 'Alzare dieci trofei. Vincere, e continuare a vincere.',
    target: 10,
    unita: 'trofei',
    premio: 50,
  },
];

export function ambizioneById(id: string | undefined): Ambizione {
  return AMBIZIONI.find((voce) => voce.id === id) ?? AMBIZIONI[0]!;
}

export interface ProgressoAmbizione {
  /** A che punto sei, nell'unità dell'ambizione. */
  fatto: number;
  target: number;
  centrata: boolean;
}

/** Le stagioni consecutive con lo stesso club. */
function piuLungaSerie(seasons: readonly SeasonRecord[]): number {
  let massimo = 0;
  let corrente = 0;
  let precedente = '';
  for (const stagione of seasons) {
    corrente = stagione.clubId === precedente ? corrente + 1 : 1;
    precedente = stagione.clubId;
    massimo = Math.max(massimo, corrente);
  }
  return massimo;
}

/**
 * A che punto è l'ambizione, con le stagioni giocate finora: si legge durante la
 * carriera, non solo alla fine. Un obiettivo che si vede avvicinare è un obiettivo
 * che cambia le decisioni.
 */
export function progressoAmbizione(
  ambizione: Ambizione,
  seasons: readonly SeasonRecord[],
  paesiPerClub: (clubId: string) => string | undefined,
): ProgressoAmbizione {
  const fatto = (() => {
    switch (ambizione.id) {
      case 'nessuna':
        return 0;
      case 'predestinato':
        return seasons.reduce((massimo, stagione) => Math.max(massimo, stagione.overallEnd), 0);
      case 'bandiera':
        return piuLungaSerie(seasons);
      case 'giramondo':
        return new Set(
          seasons.map((stagione) => paesiPerClub(stagione.clubId)).filter((paese) => paese !== undefined),
        ).size;
      case 'dal-nulla': {
        const partito = (seasons[0]?.leagueLevel ?? 1) >= 3;
        const titolo = seasons.some(
          (stagione) => stagione.leagueLevel === 1 && stagione.trophies.some((trofeo) => trofeo.kind === 'league'),
        );
        return partito && titolo ? 1 : 0;
      }
      case 'trofei':
        return seasons.reduce((somma, stagione) => somma + stagione.trophies.length, 0);
    }
  })();

  return {
    fatto,
    target: ambizione.target,
    centrata: ambizione.id !== 'nessuna' && fatto >= ambizione.target,
  };
}
