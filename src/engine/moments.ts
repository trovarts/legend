import type { Role } from '../world/types';
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
  /** Tutte le stagioni già giocate: servono a dire «mai così tanti» e non solo «tanti». */
  before?: readonly SeasonRecord[];
  /** Il ruolo: un difensore non si racconta con i gol che non ha segnato. */
  role?: Role;
}

/** «1 partite» non lo scrive nessuno: al singolare cambia tutto, articolo compreso. */
function conta(quanti: number, singolare: string, plurale: string): string {
  return quanti === 1 ? `una ${singolare}` : `${quanti} ${plurale}`;
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

  // Il confronto con tutto quello che è venuto prima: «mai così» vale più di «tanti».
  const passate = input.before ?? [];
  const maiCosiTanti = (valore: number, prendi: (s: SeasonRecord) => number): boolean =>
    passate.length >= 2 && valore > 0 && passate.every((stagione) => prendi(stagione) < valore);

  // Il salto di categoria è il fatto più grosso che possa capitare a un club.
  if (record.movement === 'promosso') {
    add(
      98,
      'promozione',
      'alto',
      record.playoffPlayed
        ? `Promossi ai playoff: ${record.clubName} sale di categoria dalla porta stretta.`
        : `${record.clubName} sale di categoria: ${record.position}° posto e promozione diretta.`,
    );
  } else if (record.movement === 'retrocesso') {
    add(96, 'retrocessione', 'basso', `${record.clubName} retrocede: ${record.position}° posto, e l'anno prossimo si ricomincia più in basso.`);
  }

  if (record.trophies.length > 0) {
    const names = record.trophies.map((trophy) => trophy.competitionName).join(' e ');
    add(100, 'trofeo', 'alto', `${names}: quest'anno c'è una medaglia in più, e tu c'eri.`);
  }

  if (record.awards.length > 0) {
    add(90, 'premio', 'alto', "Riconoscimento individuale: quest'anno il tuo nome è stato letto sul palco.");
  }

  if (input.isFirstSeason) {
    add(85, 'esordio', 'neutro', `Esordio con ${record.clubName}: ${conta(stats.appearances, 'presenza', 'presenze')} da ragazzo in prima squadra.`);
  }

  if (record.injury) {
    const tone: MomentTone = record.injury.severity === 'lieve' ? 'neutro' : 'basso';
    // «Infortunio seria» non lo scrive nessuno: l'aggettivo va concordato.
    const AL_MASCHILE: Record<string, string> = { lieve: 'lieve', seria: 'serio', grave: 'grave' };
    const quanto = AL_MASCHILE[record.injury.severity] ?? record.injury.severity;
    add(80, 'infortunio', tone, `Infortunio ${quanto}: ${conta(record.injury.matchesOut, 'partita', 'partite')} a guardare gli altri.`);
  }

  const previousGoals = input.previous?.stats.goals ?? 0;
  if (stats.goals >= previousGoals + 8 && stats.goals >= 12) {
    add(75, 'esplosione', 'alto', `${stats.goals} gol dopo i ${previousGoals} dell'anno prima: la stagione in cui tutti hanno imparato il tuo nome.`);
  }

  if (record.national.capped) {
    const tournament = record.national.tournament
      ? `, e col torneo internazionale fino a ${record.national.tournament.stageReached}`
      : '';
    add(70, 'nazionale', 'alto', `Nazionale: ${conta(record.national.caps, 'presenza', 'presenze')}${tournament}.`);
  }

  if (record.position === 1) {
    add(65, 'primo-posto', 'alto', `${record.clubName} chiude in testa a ${record.leagueName}.`);
  } else if (record.position >= 18) {
    add(60, 'lotta-salvezza', 'basso', `Stagione passata a guardare in basso: ${record.position}° posto.`);
  }

  if (record.minutesShare < 0.2) {
    add(55, 'panchina', 'basso', `Un anno di panchina: ${conta(stats.appearances, 'presenza', 'presenze')} e pochi minuti veri.`);
  } else if (record.minutesShare > 0.75) {
    const forme = [
      `Titolare inamovibile: ${stats.appearances} presenze, ${stats.minutes} minuti.`,
      `${conta(stats.appearances, 'presenza', 'presenze')}: il mister non ti toglie mai.`,
      `Sempre in campo: ${stats.minutes} minuti nelle gambe.`,
    ];
    add(40, 'titolare', 'neutro', forme[record.season % forme.length]!);
  }

  // Chi difende non si racconta coi gol che non ha segnato: la sua stagione sono
  // le partite in cui non è entrato niente.
  const dietro = input.role === 'GK' || input.role === 'DEF';

  if (dietro && stats.cleanSheets > 0) {
    const volte = conta(stats.cleanSheets, 'volta', 'volte');
    const forme = [
      `${conta(stats.cleanSheets, 'partita chiusa', 'partite chiuse')} senza subire gol, media ${stats.rating.toFixed(1)}.`,
      `La porta è rimasta inviolata ${volte}: media ${stats.rating.toFixed(1)}.`,
      `${volte} a porta inviolata, con ${stats.rating.toFixed(1)} di media.`,
    ];
    add(35, 'numeri', 'neutro', forme[record.season % forme.length]!);
  } else if (stats.goals > 0 || stats.assists > 0) {
    // Tre modi di dire la stessa cosa, a rotazione: la stessa frase per vent'anni
    // fa sembrare una carriera un foglio di calcolo.
    const forme = [
      `${stats.goals} gol e ${stats.assists} assist, con una media voto di ${stats.rating.toFixed(1)}.`,
      `Il tabellino dice ${stats.goals} gol, ${stats.assists} assist e ${stats.rating.toFixed(1)} di media.`,
      `Chiuso a quota ${stats.goals} gol e ${stats.assists} assist: media ${stats.rating.toFixed(1)}.`,
    ];
    add(35, 'numeri', 'neutro', forme[record.season % forme.length]!);
  }

  if (stats.cleanSheets >= 12) {
    add(45, 'porta-inviolata', 'alto', `${stats.cleanSheets} volte la porta è rimasta inviolata: un muro.`);
  } else if (dietro && maiCosiTanti(stats.cleanSheets, (s) => s.stats.cleanSheets) && stats.cleanSheets >= 6) {
    add(69, 'record-porta', 'alto', `${stats.cleanSheets} porte inviolate: non ne avevi mai tenute così tante.`);
  }

  const growth = record.overallEnd - record.overallStart;
  if (growth >= 3) {
    add(30, 'crescita', 'alto', `Un altro passo avanti: sei cresciuto di ${growth} punti.`);
  } else if (growth <= -3) {
    add(30, 'declino', 'basso', `Le gambe cominciano a dire qualcosa: ${growth} punti in un anno.`);
  }

  if (maiCosiTanti(stats.goals, (s) => s.stats.goals) && stats.goals >= 8) {
    add(72, 'record-gol', 'alto', `${stats.goals} gol: non ne avevi mai segnati così tanti in una stagione.`);
  } else if (maiCosiTanti(stats.assists, (s) => s.stats.assists) && stats.assists >= 6) {
    add(68, 'record-assist', 'alto', `${stats.assists} assist: il tuo miglior anno da rifinitore.`);
  }

  // Il posto perso è una notizia quanto il posto preso.
  const minutiPrima = input.previous?.minutesShare ?? record.minutesShare;
  if (record.minutesShare <= minutiPrima - 0.2 && record.minutesShare < 0.55) {
    add(
      66,
      'posto-perso',
      'basso',
      `Il posto non è più tuo: dal ${Math.round(minutiPrima * 100)}% al ${Math.round(record.minutesShare * 100)}% dei minuti.`,
    );
  } else if (record.minutesShare >= minutiPrima + 0.2 && record.minutesShare > 0.6) {
    add(64, 'posto-preso', 'alto', `Il campo se l'è preso: ${Math.round(record.minutesShare * 100)}% dei minuti, ${Math.round(minutiPrima * 100)}% l'anno prima.`);
  }

  // Prima stagione in una maglia nuova: si riparte da capo, e si vede.
  if (input.previous && input.previous.clubId !== record.clubId) {
    add(62, 'maglia-nuova', 'neutro', `Prima stagione con ${record.clubName}, in ${record.leagueName}.`);
  }

  // Quello che il club aveva chiesto ad agosto — ma solo quando è una notizia.
  // Centrare gli obiettivi ogni anno è normale: si racconta il cambio di rotta.
  if (record.objectives && record.objectivesMet) {
    const primaAndataMale = input.previous?.objectivesMet?.primary === false;
    const primaAndataBene = input.previous?.objectivesMet?.primary === true;
    if (record.objectivesMet.primary && (primaAndataMale || record.objectives.primary.kind === 'titolo')) {
      add(58, 'obiettivi-pieni', 'alto', `«${record.objectives.primary.text}»: quello che il club aveva chiesto ad agosto è arrivato.`);
    } else if (!record.objectivesMet.primary && primaAndataBene) {
      add(56, 'obiettivo-mancato', 'basso', `«${record.objectives.primary.text}»: la richiesta di agosto è rimasta lì.`);
    }
  }

  // Il cammino in coppa: uscire in semifinale non è uscire al primo turno.
  if (record.cupRound >= 3 && !record.trophies.some((trofeo) => trofeo.kind === 'nationalCup')) {
    const dove = record.cupRound === 4 ? 'in finale' : 'in semifinale';
    add(52, 'coppa-vicina', 'neutro', `In coppa si è arrivati ${dove}, e non è bastato.`);
  }

  if (record.age === 30) {
    add(28, 'trenta', 'neutro', 'Trent’anni: da qui in poi ogni stagione va guadagnata due volte.');
  }

  if (moments.length < MIN_MOMENTS) {
    add(10, 'ordinaria', 'neutro', `Una stagione senza scosse con ${record.clubName}: ${conta(stats.appearances, 'presenza', 'presenze')}.`);
  }

  return moments
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_MOMENTS)
    // Ogni momento è un capoverso a sé: comincia con la maiuscola anche quando la
    // frase parte da un numero scritto in lettere («una partita chiusa…»).
    .map((entry) => ({
      ...entry.moment,
      text: entry.moment.text.charAt(0).toUpperCase() + entry.moment.text.slice(1),
    }));
}
