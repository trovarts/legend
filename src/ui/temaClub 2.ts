/**
 * Ogni club tinge l'interfaccia dei suoi colori. Non abbiamo i marchi — e non li vogliamo —
 * ma il nome basta: i colori si ricavano da come la squadra si chiama, e restano stabili.
 */
export interface TemaClub {
  primario: string;
  secondario: string;
  chiaro: boolean;
}

/** Le tinte del calcio, non una tavolozza qualunque. */
const TINTE: readonly TemaClub[] = [
  { primario: '#d81f3f', secondario: '#6d1226', chiaro: false }, // rosso
  { primario: '#1d4ed8', secondario: '#10245e', chiaro: false }, // blu
  { primario: '#0f7a3d', secondario: '#0a3d20', chiaro: false }, // verde
  { primario: '#f5c518', secondario: '#7a5f04', chiaro: true }, // giallo
  { primario: '#e2680f', secondario: '#6d3106', chiaro: false }, // arancio
  { primario: '#7c3aed', secondario: '#3a1a70', chiaro: false }, // viola
  { primario: '#0ea5b7', secondario: '#064c55', chiaro: false }, // azzurro
  { primario: '#b91c1c', secondario: '#5a0d0d', chiaro: false }, // granata
];

/** Parole che dicono già il colore: quando ci sono, vincono loro. */
const PAROLE: readonly { chiave: RegExp; indice: number }[] = [
  { chiave: /ross|red|rouge|roja/i, indice: 0 },
  { chiave: /inter|blu|blue|azul|city|chelsea/i, indice: 1 },
  { chiave: /verd|green|celtic|betis|palmeiras/i, indice: 2 },
  { chiave: /gial|yellow|dortmund|nassr|watford/i, indice: 3 },
  { chiave: /orange|arancio|ajax|shakhtar/i, indice: 4 },
  { chiave: /viol|purple|fiorentina|anderlecht/i, indice: 5 },
  { chiave: /napoli|lazio|celeste|azzur/i, indice: 6 },
  { chiave: /torino|granata|west ham|aston/i, indice: 7 },
];

export function temaDelClub(nome: string): TemaClub {
  for (const parola of PAROLE) {
    if (parola.chiave.test(nome)) return TINTE[parola.indice]!;
  }
  let hash = 0;
  for (const carattere of nome) hash = (hash * 31 + carattere.charCodeAt(0)) >>> 0;
  return TINTE[hash % TINTE.length]!;
}
