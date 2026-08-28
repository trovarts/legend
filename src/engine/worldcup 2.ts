import type { Rng } from './rng';

export type WorldCupStage = 'gironi' | 'ottavi' | 'quarti' | 'semifinale' | 'finale';

export interface WorldCupMatch {
  stage: WorldCupStage;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  ours: boolean;
}

export interface WorldCupRun {
  name: string;
  /** Le tre partite del girone, poi l'eliminazione diretta. */
  matches: WorldCupMatch[];
  reached: WorldCupStage | 'vittoria';
  playerGoals: number;
  playerCaps: number;
}

const AVVERSARIE: readonly string[] = [
  'Brasile', 'Argentina', 'Francia', 'Germania', 'Spagna', 'Inghilterra', 'Portogallo',
  'Paesi Bassi', 'Belgio', 'Croazia', 'Uruguay', 'Marocco', 'Giappone', 'Senegal',
  'Messico', 'Corea del Sud', 'Stati Uniti', 'Danimarca', 'Svizzera', 'Serbia',
];

const ORDINE: readonly WorldCupStage[] = ['gironi', 'ottavi', 'quarti', 'semifinale', 'finale'];

/**
 * Il cammino della nazionale in un torneo internazionale: tre partite di girone e poi
 * l'eliminazione diretta, fin dove la squadra riesce ad arrivare.
 */
export function buildWorldCup(
  name: string,
  country: string,
  playerOverall: number,
  reachedStage: string,
  rng: Rng,
): WorldCupRun {
  const nostre = AVVERSARIE.filter((squadra) => squadra !== country);
  const matches: WorldCupMatch[] = [];
  let playerGoals = 0;

  const forza = 0.45 + (playerOverall - 70) * 0.012;

  const gioca = (stage: WorldCupStage, avversaria: string, deveVincere: boolean | null): void => {
    const nostri = deveVincere === true ? rng.int(1, 3) : rng.int(0, 2);
    const loro = deveVincere === true ? rng.int(0, nostri - 1) : deveVincere === false ? nostri + rng.int(1, 2) : rng.int(0, 2);
    matches.push({ stage, home: country, away: avversaria, homeGoals: nostri, awayGoals: loro, ours: true });
    for (let gol = 0; gol < nostri; gol += 1) {
      if (rng.chance(forza * 0.5)) playerGoals += 1;
    }
  };

  // Girone: tre partite, con un esito qualunque.
  for (let partita = 0; partita < 3; partita += 1) {
    gioca('gironi', nostre[rng.int(0, nostre.length - 1)]!, null);
  }

  const indiceFinale = ORDINE.indexOf(reachedStage as WorldCupStage);
  const arrivaA = indiceFinale >= 0 ? indiceFinale : 0;
  const vittoria = reachedStage === 'vittoria';
  const ultimo = vittoria ? ORDINE.length - 1 : arrivaA;

  for (let turno = 1; turno <= ultimo; turno += 1) {
    const stage = ORDINE[turno]!;
    // Si vince fino al turno in cui si esce; la partita finale è quella persa.
    const deveVincere = vittoria || turno < ultimo;
    gioca(stage, nostre[rng.int(0, nostre.length - 1)]!, deveVincere);
  }

  return {
    name,
    matches,
    reached: vittoria ? 'vittoria' : (ORDINE[ultimo] ?? 'gironi'),
    playerGoals,
    playerCaps: matches.length,
  };
}
