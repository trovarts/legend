'use client';

import { seasonMoments } from '../engine/moments';
import type { SeasonRecord } from '../engine/types';

export function Stagione({
  record,
  previous,
  isFirst,
  playerName,
}: {
  record: SeasonRecord;
  previous: SeasonRecord | undefined;
  isFirst: boolean;
  playerName: string;
}) {
  const moments = seasonMoments({ record, previous, isFirstSeason: isFirst, playerName });
  const crescita = record.overallEnd - record.overallStart;

  return (
    <div className="card">
      <div className="riga">
        <strong>{record.clubName}</strong>
        <span className="tenue numero">{record.age} anni</span>
      </div>
      <div className="riga tenue">
        <span>
          {record.leagueName} — {record.position}° posto
        </span>
        <span className="numero">
          OVR {record.overallEnd}
          {crescita !== 0 && ` (${crescita > 0 ? '+' : ''}${crescita})`}
        </span>
      </div>

      {moments.map((moment) => (
        <p key={moment.id} className={`momento momento-${moment.tone}`}>
          {moment.text}
        </p>
      ))}

      <div
        className="riga numero"
        style={{ borderTop: '1px solid var(--bordo)', marginTop: '.7rem', paddingTop: '.7rem' }}
      >
        <span>{record.stats.appearances} presenze</span>
        <span>{record.stats.goals} gol</span>
        <span>{record.stats.assists} assist</span>
        <span>voto {record.stats.rating.toFixed(1)}</span>
      </div>

      {record.choices.map((choice) => (
        <p key={`${choice.dilemmaId}-${choice.optionId}`} className="posta">
          {choice.optionLabel}: {choice.outcomeText}
        </p>
      ))}
    </div>
  );
}
