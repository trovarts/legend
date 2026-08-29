import type { SeasonRecord } from './types';

/**
 * Le voci del giornale: due virgolettati per stagione.
 *
 * Un pezzo fatto solo di frasi del cronista è un riassunto; con due voci diventa un
 * articolo. Non aggiungono niente al gioco — dicono le stesse cose che il resoconto
 * dice coi numeri — ma le fanno dire a qualcuno, ed è per questo che si leggono.
 *
 * Niente casualità: le voci si ricavano dai fatti della stagione, così la stessa
 * carriera raccontata due volte è la stessa carriera.
 */
export interface Voice {
  id: string;
  /** Chi parla: «il mister», «un compagno di reparto»… */
  source: string;
  text: string;
}

export interface VoicesInput {
  record: SeasonRecord;
  previous: SeasonRecord | undefined;
  isFirstSeason: boolean;
}

interface Candidate {
  id: string;
  source: string;
  /** Più forme per la stessa situazione: dopo vent'anni la ripetizione si sente. */
  forme: readonly string[];
  when: (input: VoicesInput) => boolean;
  /** Chi parla per primo: un trofeo conta più di una stagione di mestiere. */
  peso: number;
}

const CANDIDATI: readonly Candidate[] = [
  {
    id: 'trofeo', peso: 10, source: 'il mister',
    when: ({ record }) => record.trophies.length > 0,
    forme: [
      'Questa squadra ha imparato a vincere quando faceva male. Il resto viene da lì.',
      'Ci sono anni in cui tutto torna. Bisogna essere pronti a prenderseli.',
      'L\'ho detto a settembre e lo ripeto adesso: questo gruppo non molla la presa.',
    ],
  },
  {
    id: 'infortunio-grave', peso: 9, source: 'lo staff medico',
    when: ({ record }) => record.injury?.severity === 'grave',
    forme: [
      'Non ci sono scorciatoie. Il ginocchio decide i tempi, non il calendario.',
      'Torna quando è pronto e non un giorno prima. Su questo non si tratta.',
    ],
  },
  {
    id: 'panchina', peso: 8, source: 'un compagno di reparto',
    when: ({ record }) => record.minutesShare < 0.15,
    forme: [
      'Si allena come uno che gioca tutte le domeniche. Non è scontato quando non giochi mai.',
      'Nello spogliatoio nessuno gli ha sentito dire una parola fuori posto. Nemmeno una.',
    ],
  },
  {
    id: 'gol', peso: 7, source: 'un osservatore',
    when: ({ record }) => record.stats.goals >= 18,
    forme: [
      'Non è il numero, è quando arrivano. Segna nelle partite in cui gli altri spariscono.',
      'Ne ho visti tanti fare quei gol lì. Pochi li fanno per una stagione intera.',
    ],
  },
  {
    id: 'crescita', peso: 6, source: 'il preparatore',
    when: ({ record }) => record.overallEnd - record.overallStart >= 4,
    forme: [
      'A gennaio reggeva novanta minuti a fatica. A maggio li chiudeva in crescendo.',
      'Il salto non l\'ha fatto in partita. L\'ha fatto il martedì, quando non guarda nessuno.',
    ],
  },
  {
    id: 'declino', peso: 6, source: 'un cronista di lungo corso',
    when: ({ record }) => record.overallEnd - record.overallStart <= -4,
    forme: [
      'Corre meno, è vero. Ma sa dove andare, e quello non se ne va con gli anni.',
      'Il campo restituisce sempre il conto. La differenza è come lo si paga.',
    ],
  },
  {
    id: 'maglia-nuova', peso: 5, source: 'il direttore sportivo',
    when: ({ record, previous }) => previous !== undefined && previous.clubId !== record.clubId,
    forme: [
      'L\'abbiamo cercato per mesi. Sapevamo cosa prendevamo e sapevamo perché.',
      'Non è arrivato per riempire una casella. È arrivato per cambiare un reparto.',
    ],
  },
  {
    id: 'esordio', peso: 5, source: 'il capitano',
    when: ({ isFirstSeason }) => isFirstSeason,
    forme: [
      'Il primo anno si guarda e si sta zitti. Lui ha guardato e ha anche giocato.',
      'Gli ho detto una cosa sola: qui il pallone pesa. Se l\'è preso lo stesso.',
    ],
  },
  {
    id: 'nazionale', peso: 5, source: 'il commissario tecnico',
    when: ({ record }) => record.national.capped,
    forme: [
      'La convocazione non è un premio, è un punto di partenza. Lui l\'ha capito subito.',
      'Ci serviva uno che non avesse paura del pallone. L\'abbiamo trovato.',
    ],
  },
  {
    id: 'testa-classifica', peso: 4, source: 'un tifoso, fuori dallo stadio',
    when: ({ record }) => record.position === 1,
    forme: [
      'Sono trent\'anni che vengo qui. Un anno così me lo ricorderò tutto.',
      'Non ci credevamo a settembre. Adesso non vogliamo più svegliarci.',
    ],
  },
  {
    id: 'salvezza', peso: 4, source: 'il presidente',
    when: ({ record }) => record.position >= 18,
    forme: [
      'Ci siamo salvati con le unghie. Il prossimo anno si comincia diversamente.',
      'Non è l\'annata che volevamo. È l\'annata che ci siamo meritati.',
    ],
  },
  {
    id: 'mestiere', peso: 1, source: 'un compagno di squadra',
    when: () => true,
    forme: [
      'È uno di quelli che l\'allenamento del martedì lo fanno sul serio. Si vede la domenica.',
      'Parla poco e sbaglia poco. In uno spogliatoio vale più di quanto sembri.',
      'Quando gira male è il primo a chiedere il pallone. Non tutti lo fanno.',
    ],
  },
];

const QUANTE = 2;

/** Un numero stabile ricavato dalla stagione: sceglie la forma senza sorteggiare. */
function impronta(record: SeasonRecord, id: string): number {
  let valore = record.season * 2654435761 + record.age * 40503;
  for (const carattere of `${record.clubName}${id}`) {
    valore = (valore * 31 + carattere.charCodeAt(0)) >>> 0;
  }
  return valore >>> 0;
}

export function seasonVoices(input: VoicesInput): Voice[] {
  const scelti = CANDIDATI.filter((candidato) => candidato.when(input))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, QUANTE);

  return scelti.map((candidato) => ({
    id: candidato.id,
    source: candidato.source,
    text: candidato.forme[impronta(input.record, candidato.id) % candidato.forme.length]!,
  }));
}
