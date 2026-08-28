import type { Role } from '../world/types.js';

/** Il giocatore dell'utente. Il potenziale non viene mai mostrato come numero (spec §3.1). */
export interface CareerPlayer {
  name: string;
  nationality: string;
  role: Role;
  age: number;
  overall: number;
  potential: number;
  /** 1-99: resistenza all'età e agli infortuni. Sposta l'età del picco. */
  physique: number;
  peakAge: number;
  seasonsPlayed: number;
  retired: boolean;
}

/** Una riga della timeline di carriera. La Fase 2 aggiungerà gol, assist e trofei. */
export interface SeasonRecord {
  season: number;
  age: number;
  clubId: string;
  clubName: string;
  leagueId: string;
  minutesShare: number;
  overallStart: number;
  overallEnd: number;
}

export interface CareerResult {
  player: CareerPlayer;
  seasons: SeasonRecord[];
  peakOverall: number;
  retiredAt: number;
}
