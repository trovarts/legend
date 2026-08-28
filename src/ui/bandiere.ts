/** Bandiere per i paesi del database, come emoji: nessun file da scaricare. */
const CODICI: Record<string, string> = {
  Argentina: 'AR', Australia: 'AU', Austria: 'AT', Belgium: 'BE', Brazil: 'BR',
  Chile: 'CL', 'China PR': 'CN', Colombia: 'CO', Denmark: 'DK', England: 'GB-ENG',
  France: 'FR', Germany: 'DE', India: 'IN', Italy: 'IT', Japan: 'JP',
  'Korea Republic': 'KR', Mexico: 'MX', Netherlands: 'NL', Norway: 'NO', Paraguay: 'PY',
  Peru: 'PE', Poland: 'PL', Portugal: 'PT', 'Republic of Ireland': 'IE', Romania: 'RO',
  'Saudi Arabia': 'SA', Scotland: 'GB-SCT', Spain: 'ES', Sweden: 'SE', Switzerland: 'CH',
  Türkiye: 'TR', 'United States': 'US', Uruguay: 'UY',
};

const NOMI: Record<string, string> = {
  Argentina: 'Argentina', Australia: 'Australia', Austria: 'Austria', Belgium: 'Belgio',
  Brazil: 'Brasile', Chile: 'Cile', 'China PR': 'Cina', Colombia: 'Colombia',
  Denmark: 'Danimarca', England: 'Inghilterra', France: 'Francia', Germany: 'Germania',
  India: 'India', Italy: 'Italia', Japan: 'Giappone', 'Korea Republic': 'Corea del Sud',
  Mexico: 'Messico', Netherlands: 'Paesi Bassi', Norway: 'Norvegia', Paraguay: 'Paraguay',
  Peru: 'Perù', Poland: 'Polonia', Portugal: 'Portogallo',
  'Republic of Ireland': 'Irlanda', Romania: 'Romania', 'Saudi Arabia': 'Arabia Saudita',
  Scotland: 'Scozia', Spain: 'Spagna', Sweden: 'Svezia', Switzerland: 'Svizzera',
  Türkiye: 'Turchia', 'United States': 'Stati Uniti', Uruguay: 'Uruguay',
};

export function bandiera(paese: string): string {
  const codice = CODICI[paese];
  if (codice === undefined) return '⚽';
  if (codice === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (codice === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  return String.fromCodePoint(...[...codice].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Il nome del paese in italiano: "Italy" in un gioco italiano stona. */
export function inItaliano(paese: string): string {
  return NOMI[paese] ?? paese;
}
