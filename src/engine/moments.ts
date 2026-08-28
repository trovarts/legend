import type { SeasonRecord } from './types';

export type MomentTone = 'alto' | 'basso' | 'neutro';

export interface Moment {
  id: string;
  tone: MomentTone;
  text: string;
}

export interface MomentsInput {
  record: SeasonRecord;
  isFirstSeason: boolean;
  previous: SeasonRecord | undefined;
  playerName: string;
}

const MAX_MOMENTS = 5;
const MIN_MOMENTS = 2;

/**
 * Da una stagione di numeri a una manciata di momenti raccontati (spec §3.2).
 * Nessuna casualità: gli stessi fatti producono sempre lo stesso racconto, così una
 * carriera rigiocata dal suo seed si legge identica.
 */
export function seasonMoments(input: MomentsInput): Moment[] {
  const { record } = input;
  const stats = record.stats;
  const moments: { weight: number; moment: Moment }[] = [];

  const add = (weight: number, id: string, tone: MomentTone, text: string): void => {
    moments.push({ weight, moment: { id, tone, text } });
  };

  if (record.trophies.length > 0) {
    const names = record.trophies.map((trophy) => trophy.competitionName).join(' e ');
    add(100, 'trofeo', 'alto', `${names}: quest'anno c'è una medaglia in più, e tu c'eri.`);
  }

  if (record.awards.length > 0) {
    add(90, 'premio', 'alto', "Riconoscimento individuale: quest'anno il tuo nome è stato letto sul palco.");
  }

  if (input.isFirstSeason) {
    add(85, 'esordio', 'neutro', `Esordio con ${record.clubName}: ${stats.appearances} presenze da ragazzo in prima squadra.`);
  }

  if (record.injury) {
    const tone: MomentTone = record.injury.severity === 'lieve' ? 'neutro' : 'basso';
    add(80, 'infortunio', tone, `Infortunio ${record.injury.severity}: ${record.injury.matchesOut} partite a guardare gli altri.`);
  }

  const previousGoals = input.previous?.stats.goals ?? 0;
  if (stats.goals >= previousGoals + 8 && stats.goals >= 12) {
    add(75, 'esplosione', 'alto', `${stats.goals} gol dopo i ${previousGoals} dell'anno prima: la stagione in cui tutti hanno imparato il tuo nome.`);
  }

  if (record.national.capped) {
    const tournament = record.national.tournament
      ? `, e col torneo internazionale fino a ${record.national.tournament.stageReached}`
      : '';
    add(70, 'nazionale', 'alto', `Nazionale: ${record.national.caps} presenze${tournament}.`);
  }

  if (record.position === 1) {
    add(65, 'primo-posto', 'alto', `${record.clubName} chiude in testa a ${record.leagueName}.`);
  } else if (record.position >= 18) {
    add(60, 'lotta-salvezza', 'basso', `Stagione passata a guardare in basso: ${record.position}° posto.`);
  }

  if (record.minutesShare < 0.2) {
    add(55, 'panchina', 'basso', `Un anno di panchina: ${stats.appearances} presenze e pochi minuti veri.`);
  } else if (record.minutesShare > 0.75) {
    add(40, 'titolare', 'neutro', `Titolare inamovibile: ${stats.appearances} presenze, ${stats.minutes} minuti.`);
  }

  if (stats.goals > 0 || stats.assists > 0) {
    add(35, 'numeri', 'neutro', `${stats.goals} gol e ${stats.assists} assist, con una media voto di ${stats.rating.toFixed(1)}.`);
  }

  if (stats.cleanSheets >= 10) {
    add(45, 'porta-inviolata', 'alto', `${stats.cleanSheets} volte la porta è rimasta inviolata.`);
  }

  const growth = record.overallEnd - record.overallStart;
  if (growth >= 3) {
    add(30, 'crescita', 'alto', `Un altro passo avanti: sei cresciuto di ${growth} punti.`);
  } else if (growth <= -3) {
    add(30, 'declino', 'basso', `Le gambe cominciano a dire qualcosa: ${growth} punti in un anno.`);
  }

  if (moments.length < MIN_MOMENTS) {
    add(10, 'ordinaria', 'neutro', `Una stagione senza scosse con ${record.clubName}: ${stats.appearances} presenze.`);
  }

  return moments
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_MOMENTS)
    .map((entry) => entry.moment);
}
