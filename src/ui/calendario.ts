/**
 * Le date della carriera.
 *
 * «Stagione 7» è un numero di database. «24/25» e «Agosto 2027» sono un calendario:
 * dicono quanti anni sono passati senza far fare i conti a nessuno, e sono il modo
 * in cui il calcio parla di sé.
 *
 * L'anno si ricava dall'**età**, non dal numero di stagione. Il numero di stagione
 * conta solo la prima squadra, quindi chi passa tre anni nel vivaio esordirebbe
 * comunque nel 2024: il tempo passato fra i ragazzi sparirebbe dal calendario. L'età
 * invece c'è in ogni schermata, vivaio compreso, e cresce di uno all'anno sempre.
 */
const ANNO_BASE = 2024;

/** L'età a cui comincia tutto: il primo anno di vivaio è la stagione 24/25. */
const ETA_BASE = 14;

/** L'anno solare in cui comincia la stagione giocata a quell'età. */
export function annoDi(age: number): number {
  return ANNO_BASE + Math.max(0, age - ETA_BASE);
}

/** L'etichetta breve di una stagione: 24/25, 25/26… */
export function etichettaStagione(age: number): string {
  const inizio = annoDi(age);
  return `${String(inizio % 100).padStart(2, '0')}/${String((inizio + 1) % 100).padStart(2, '0')}`;
}

export type Momento = 'ritiro' | 'stagione' | 'fine' | 'mercato';

const MESI: Record<Momento, { mese: string; offset: 0 | 1 }> = {
  ritiro: { mese: 'Agosto', offset: 0 },
  stagione: { mese: 'Febbraio', offset: 1 },
  fine: { mese: 'Maggio', offset: 1 },
  mercato: { mese: 'Luglio', offset: 1 },
};

/** Mese e anno di un momento della stagione: «Agosto 2024», «Maggio 2025». */
export function dataDi(momento: Momento, age: number): string {
  const { mese, offset } = MESI[momento];
  return `${mese} ${annoDi(age) + offset}`;
}
