/**
 * Le competizioni che esistono davvero attorno a un club.
 *
 * Non basta dire «coppa continentale»: chi arriva secondo in Italia gioca la Coppa
 * Europea, chi arriva sesto la Terza. È la differenza fra un elenco di trofei e una
 * piramide che si sente addosso.
 */
export type ContinentalTier = 'prima' | 'seconda' | 'terza';

export interface CountryCompetitions {
  cup: string;
  continental: Record<ContinentalTier, string>;
  national: { major: string; minor: string };
  /** Quanti posti dà il campionato per ciascuna coppa continentale. */
  spots: { prima: number; seconda: number; terza: number };
  /** Ranking del paese: più è alto, più posti nelle coppe. */
  ranking: number;
}

const EUROPA = {
  continental: {
    prima: 'Coppa Europea',
    seconda: 'Seconda Coppa Europea',
    terza: 'Terza Coppa Europea',
  },
  national: { major: 'Europei', minor: 'Lega delle Nazioni' },
} as const;

const SUDAMERICA = {
  continental: {
    prima: 'Coppa Sudamericana',
    seconda: 'Seconda Coppa Sudamericana',
    terza: 'Coppa Continentale Minore',
  },
  national: { major: 'Coppa America', minor: 'Qualificazioni Mondiali' },
} as const;

const ASIA = {
  continental: {
    prima: 'Coppa Asiatica per Club',
    seconda: 'Seconda Coppa Asiatica',
    terza: 'Coppa Asiatica Minore',
  },
  national: { major: 'Coppa d’Asia', minor: 'Qualificazioni Mondiali' },
} as const;

const NORDAMERICA = {
  continental: {
    prima: 'Coppa Nordamericana',
    seconda: 'Seconda Coppa Nordamericana',
    terza: 'Coppa Nordamericana Minore',
  },
  national: { major: 'Coppa d’Oro', minor: 'Lega delle Nazioni' },
} as const;

/** Ranking: quanto è forte il movimento del paese. Decide i posti nelle coppe. */
const RANKING: Record<string, number> = {
  Spain: 1, England: 2, Italy: 3, Germany: 4, France: 5, Netherlands: 6, Portugal: 7,
  Belgium: 8, Türkiye: 9, Austria: 10, Switzerland: 11, Denmark: 12, Norway: 13,
  Sweden: 14, Poland: 15, Romania: 16, Scotland: 17, 'Republic of Ireland': 18,
  Brazil: 1, Argentina: 2, Colombia: 3, Chile: 4, Peru: 5, Paraguay: 6, Uruguay: 7,
  'Saudi Arabia': 1, Japan: 2, 'Korea Republic': 3, 'China PR': 4, India: 5,
  'United States': 1, Mexico: 2,
  Australia: 3,
};

const COPPE_NAZIONALI: Record<string, string> = {
  Italy: 'Coppa Italiana', England: 'Coppa d’Inghilterra', Spain: 'Coppa di Spagna',
  Germany: 'Coppa di Germania', France: 'Coppa di Francia', Portugal: 'Coppa del Portogallo',
  Netherlands: 'Coppa d’Olanda', Belgium: 'Coppa del Belgio', Brazil: 'Coppa del Brasile',
  Argentina: 'Coppa d’Argentina', 'Saudi Arabia': 'Coppa Saudita', Japan: 'Coppa del Giappone',
  'United States': 'Coppa Americana', Mexico: 'Coppa del Messico', Türkiye: 'Coppa di Turchia',
};

const CONTINENTE: Record<string, typeof EUROPA | typeof SUDAMERICA | typeof ASIA | typeof NORDAMERICA> = {
  Brazil: SUDAMERICA, Argentina: SUDAMERICA, Colombia: SUDAMERICA, Chile: SUDAMERICA,
  Peru: SUDAMERICA, Paraguay: SUDAMERICA, Uruguay: SUDAMERICA,
  'Saudi Arabia': ASIA, Japan: ASIA, 'Korea Republic': ASIA, 'China PR': ASIA,
  India: ASIA, Australia: ASIA,
  'United States': NORDAMERICA, Mexico: NORDAMERICA,
};

export function competitionsOf(country: string): CountryCompetitions {
  const continente = CONTINENTE[country] ?? EUROPA;
  const ranking = RANKING[country] ?? 20;

  // I movimenti più forti portano più squadre nelle coppe: come nella realtà.
  const spots =
    ranking <= 4 ? { prima: 4, seconda: 2, terza: 1 }
    : ranking <= 8 ? { prima: 3, seconda: 2, terza: 1 }
    : ranking <= 14 ? { prima: 2, seconda: 1, terza: 1 }
    : { prima: 1, seconda: 1, terza: 1 };

  return {
    cup: COPPE_NAZIONALI[country] ?? 'Coppa Nazionale',
    continental: continente.continental,
    national: continente.national,
    spots,
    ranking,
  };
}

/** In quale coppa continentale finisce chi ha chiuso in questa posizione. */
export function continentalTierFor(
  position: number,
  competitions: CountryCompetitions,
): ContinentalTier | null {
  const { spots } = competitions;
  if (position <= spots.prima) return 'prima';
  if (position <= spots.prima + spots.seconda) return 'seconda';
  if (position <= spots.prima + spots.seconda + spots.terza) return 'terza';
  return null;
}
