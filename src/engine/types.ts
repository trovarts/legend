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

/** Quello che resta di una stagione sul tabellino. */
export interface SeasonStats {
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  /** Solo per portieri e difensori; zero per gli altri. */
  cleanSheets: number;
  /** Voto medio, fra 5.0 e 9.0, con una cifra decimale. */
  rating: number;
}

export type TrophyKind = 'league' | 'nationalCup' | 'continental';

export interface Trophy {
  kind: TrophyKind;
  season: number;
  competitionName: string;
}

export type AwardKind = 'topScorer' | 'leagueMvp' | 'youngPlayer';

export interface Award {
  kind: AwardKind;
  season: number;
  competitionName: string;
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
