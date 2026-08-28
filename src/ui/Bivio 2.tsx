'use client';

import type { SeasonSoFar } from '../engine/career';
import type { Dilemma } from '../engine/types';
import { Puntata } from './Puntata';
import { Scelta, Scelte } from './Scelte';

/**
 * La schermata che ci distingue dal concorrente: ogni strada dichiara cosa mette in
 * gioco, e le probabilità mostrate sono quelle che il motore usa davvero (spec §3.5).
 */
export function Bivio({
  dilemma,
  soFar,
  onChoose,
}: {
  dilemma: Dilemma;
  soFar: SeasonSoFar;
  onChoose: (optionId: string) => void;
}) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">SPOGLIATOIO</span>
        <span className="testata-data">
          {soFar.clubName} · {soFar.leagueName}
        </span>
      </header>

      <span className="occhiello">Una decisione</span>
      <h2 className="titolone">{dilemma.title}</h2>
      <p className="sommario numero">
        {soFar.stats.appearances} presenze · {soFar.stats.goals} gol · media{' '}
        {soFar.stats.rating.toFixed(1)} · {Math.round(soFar.minutesShare * 100)}% dei minuti
        {soFar.injury && ` · infortunio ${soFar.injury.severity}`}
      </p>

      <p style={{ marginBottom: '1rem' }}>{dilemma.text}</p>

      <Scelte>
        {dilemma.options.map((option, index) => (
          <Scelta
            key={option.id}
            sigla={String(index + 1)}
            titolo={option.label}
            nota={option.stake}
            etichetta={option.outcomes.length > 1 ? 'una scommessa' : 'esito certo'}
            sicura={option.outcomes.length === 1}
            puntata={<Puntata option={option} />}
            onClick={() => onChoose(option.id)}
          />
        ))}
      </Scelte>
    </section>
  );
}
