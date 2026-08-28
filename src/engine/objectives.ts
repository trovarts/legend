import type { Rng } from './rng';

/** Quello che la società ti chiede prima che la stagione cominci. */
export interface SeasonObjectives {
  main: string;
  secondary: string;
  /** Posizione da non superare perché l'obiettivo principale sia raggiunto. */
  targetPosition: number;
  /** Vero se serve arrivare almeno agli ottavi di coppa. */
  cupRequired: boolean;
}

export interface ObjectivesOutcome {
  mainDone: boolean;
  secondaryDone: boolean;
}

/**
 * Gli obiettivi nascono dalla forza della squadra: a una corazzata si chiede di vincere,
 * a una piccola di salvarsi. Danno uno scopo alla stagione che sta per cominciare.
 */
export function seasonObjectives(
  clubStrengthValue: number,
  leagueAverage: number,
  clubCount: number,
  rng: Rng,
): SeasonObjectives {
  const scarto = clubStrengthValue - leagueAverage;
  const attesa = Math.round(clubCount / 2 - scarto * 1.4);
  const targetPosition = Math.min(clubCount, Math.max(1, attesa + rng.int(-1, 1)));

  const main =
    targetPosition === 1
      ? 'Vincere il campionato'
      : targetPosition <= 4
        ? `Chiudere almeno al ${targetPosition}° posto ed entrare nelle coppe`
        : targetPosition >= clubCount - 3
          ? 'Salvarsi, e senza soffrire fino alla fine'
          : `Chiudere almeno al ${targetPosition}° posto`;

  const cupRequired = clubStrengthValue > leagueAverage;
  return {
    main,
    secondary: cupRequired
      ? 'Raggiungere almeno gli ottavi di coppa nazionale'
      : 'Fare bella figura in coppa nazionale',
    targetPosition,
    cupRequired,
  };
}

export function checkObjectives(
  objectives: SeasonObjectives,
  position: number,
  wonAnyCup: boolean,
): ObjectivesOutcome {
  return {
    mainDone: position <= objectives.targetPosition,
    secondaryDone: wonAnyCup || !objectives.cupRequired,
  };
}
