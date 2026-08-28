'use client';

import type { SeasonSoFar } from '../engine/career';
import type { Dilemma } from '../engine/types';

/**
 * La schermata che ci distingue dal concorrente: ogni strada dichiara cosa mette
 * in gioco, e le probabilità mostrate sono quelle che il motore usa davvero (spec §3.5).
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
    <div className="card" style={{ borderColor: 'var(--tabellone)' }}>
      <p className="tenue numero">
        {soFar.clubName} · {soFar.leagueName} · {soFar.stats.appearances} presenze,{' '}
        {soFar.stats.goals} gol, voto {soFar.stats.rating.toFixed(1)}
      </p>
      <h2>{dilemma.title}</h2>
      <p>{dilemma.text}</p>
      {dilemma.options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="bottone"
          style={{ marginTop: '.6rem' }}
          onClick={() => onChoose(option.id)}
        >
          <strong>{option.label}</strong>
          <span className="posta">{option.stake}</span>
        </button>
      ))}
    </div>
  );
}
