/**
 * I continenti sulla mappa.
 *
 * Un planisfero intero in un riquadro da trecento pixel non si tocca: l'Italia è
 * grande come un'unghia. Zoomando su un continente per volta i paesi diventano
 * bersagli veri, ed è così che si sceglie da dove cominciare.
 *
 * I riquadri sono in coordinate della proiezione della mappa (1000×500,
 * equirettangolare): x = (longitudine + 180) / 360 · 1000, y = (90 − latitudine) / 180 · 500.
 */
export interface Continente {
  id: string;
  nome: string;
  /** Il riquadro da inquadrare: "x y larghezza altezza". */
  viewBox: string;
}

export const CONTINENTI: readonly Continente[] = [
  { id: 'europa', nome: 'Europa', viewBox: '462 44 168 118' },
  { id: 'sudamerica', nome: 'Sudamerica', viewBox: '268 208 142 200' },
  { id: 'nordamerica', nome: 'Nordamerica', viewBox: '30 44 330 190' },
  { id: 'asia', nome: 'Asia e Oceania', viewBox: '565 78 435 300' },
  { id: 'africa', nome: 'Africa', viewBox: '444 138 204 212' },
];

/** In quale riquadro cade un paese giocabile. */
const DOVE: Record<string, string> = {
  Argentina: 'sudamerica', Brazil: 'sudamerica', Chile: 'sudamerica', Peru: 'sudamerica',
  Colombia: 'sudamerica', Uruguay: 'sudamerica', Paraguay: 'sudamerica', Ecuador: 'sudamerica',
  Bolivia: 'sudamerica', Venezuela: 'sudamerica',

  'United States': 'nordamerica', Mexico: 'nordamerica', Canada: 'nordamerica',
  'Costa Rica': 'nordamerica', Panama: 'nordamerica', Jamaica: 'nordamerica',

  'Saudi Arabia': 'asia', Japan: 'asia', 'Korea Republic': 'asia', 'China PR': 'asia',
  India: 'asia', Australia: 'asia', 'United Arab Emirates': 'asia', Qatar: 'asia',
  Iran: 'asia', Iraq: 'asia', Thailand: 'asia', Indonesia: 'asia', 'New Zealand': 'asia',
  Uzbekistan: 'asia', Kazakhstan: 'asia',

  Morocco: 'africa', Egypt: 'africa', Algeria: 'africa', Tunisia: 'africa', Nigeria: 'africa',
  Senegal: 'africa', Ghana: 'africa', Cameroon: 'africa', 'South Africa': 'africa',
  'Ivory Coast': 'africa', "Côte d'Ivoire": 'africa', Mali: 'africa',
};

/** Tutto quello che non è altrove è Europa: è lì che sta il grosso dei campionati. */
export function continenteDi(paese: string): string {
  return DOVE[paese] ?? 'europa';
}
