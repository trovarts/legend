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

/** Un'offerta ricevuta a fine stagione. `expectedMinutesShare` è la stima che l'utente vede. */
export interface Offer {
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  leagueLevel: number;
  feeEur: number;
  weeklyWageEur: number;
  expectedMinutesShare: number;
  isLoan: boolean;
}

/** La stagione in nazionale. `tournament` è valorizzato solo negli anni di torneo. */
export interface NationalSeason {
  capped: boolean;
  caps: number;
  goals: number;
  tournament: { name: string; stageReached: string } | null;
}

/** I Segni sono la memoria della carriera: una scelta fatta a vent'anni pesa ancora a trenta. */
export type MarkId =
  | 'ginocchio-fragile'
  | 'uomo-spogliatoio'
  | 'rissa-col-mister'
  | 'mercenario'
  | 'bandiera'
  | 'beniamino-dei-tifosi'
  | 'promessa-tradita'
  | 'tornato-a-casa'
  | 'carattere-fragile'
  | 'leader-riconosciuto';

export interface Mark {
  id: MarkId;
  /** Da 0 a 1: quanto pesa adesso. Cala col tempo, tranne per i segni permanenti. */
  intensity: number;
  seasonAcquired: number;
}

export type InjurySeverity = 'lieve' | 'seria' | 'grave';

export interface Injury {
  severity: InjurySeverity;
  matchesOut: number;
  season: number;
}

/** Cosa cambia dopo una scelta. Tutti i campi sono opzionali: un esito può non fare niente. */
export interface DilemmaEffects {
  /** Punti di overall, in più o in meno, subito. */
  overall?: number;
  /** Minuti guadagnati o persi nella stagione successiva. */
  minutesDelta?: number;
  addMark?: { id: MarkId; intensity: number };
  removeMark?: MarkId;
  /** Anni di carriera guadagnati o bruciati. */
  retirementDelta?: number;
  valueMultiplier?: number;
}

export interface DilemmaOutcome {
  /** Probabilità dell'esito: la somma delle opzioni di un bivio fa 1. */
  chance: number;
  text: string;
  effects: DilemmaEffects;
}

export interface DilemmaOption {
  id: string;
  label: string;
  /** La posta dichiarata: cosa rischi e cosa guadagni, in chiaro (spec §3.5). */
  stake: string;
  outcomes: DilemmaOutcome[];
}

export interface Dilemma {
  id: string;
  title: string;
  text: string;
  options: DilemmaOption[];
}

/** Cosa il giocatore ha deciso, e com'è andata. */
export interface DilemmaChoice {
  dilemmaId: string;
  optionId: string;
  optionLabel: string;
  outcomeText: string;
  season: number;
}

/** Una riga della timeline di carriera. */
export interface SeasonRecord {
  season: number;
  age: number;
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  leagueLevel: number;
  minutesShare: number;
  overallStart: number;
  overallEnd: number;
  stats: SeasonStats;
  /** Posizione finale del club in campionato, 1-based. */
  position: number;
  trophies: Trophy[];
  awards: Award[];
  national: NationalSeason;
  valueEur: number;
  /** Offerte ricevute a fine stagione. */
  offers: Offer[];
}

export interface CareerResult {
  player: CareerPlayer;
  seasons: SeasonRecord[];
  peakOverall: number;
  retiredAt: number;
  /** Nomi dei club in cui ha giocato, in ordine, senza ripetizioni consecutive. */
  clubsPlayed: string[];
  trophies: Trophy[];
  awards: Award[];
  peakValueEur: number;
  totalCaps: number;
}
