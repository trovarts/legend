/** Famiglia di ruolo. Il punteggio finale è normalizzato su queste quattro (spec §3.7). */
export type Role = 'GK' | 'DEF' | 'MID' | 'FWD';

/** Un calciatore del mondo di gioco (compagno, avversario, concorrente per il posto). */
export interface WorldPlayer {
  id: string;
  name: string;
  age: number;
  role: Role;
  overall: number;
  potential: number;
  valueEur: number;
  nationality: string;
}

export interface Club {
  id: string;
  name: string;
  squad: WorldPlayer[];
}

export interface LeagueSummary {
  /** Slug univoco, es. "serie-a-31". */
  id: string;
  name: string;
  /** Dedotta dalla nazionalità più frequente in rosa. */
  country: string;
  /** 1 = massima serie, fino a 4. */
  level: number;
  clubCount: number;
}

export interface LeagueBundle {
  league: LeagueSummary;
  clubs: Club[];
}
