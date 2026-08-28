/**
 * Le date della carriera.
 *
 * «Stagione 7» è un numero di database. «24/25» e «Agosto 2027» sono un calendario:
 * dicono quanti anni sono passati senza far fare i conti a nessuno, e sono il modo
 * in cui il calcio parla di sé.
 */
const ANNO_BASE = 2024;

/** L'anno solare in cui comincia la stagione: la prima parte nell'estate 2024. */
export function annoDi(season: number): number {
  return ANNO_BASE + Math.max(0, season - 1);
}

/** L'etichetta breve di una stagione: 24/25, 25/26… */
export function etichettaStagione(season: number): string {
  const inizio = annoDi(season);
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
export function dataDi(momento: Momento, season: number): string {
  const { mese, offset } = MESI[momento];
  return `${mese} ${annoDi(season) + offset}`;
}
