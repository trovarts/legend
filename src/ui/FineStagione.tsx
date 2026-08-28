'use client';

import { useMemo, useState } from 'react';
import { clubStrength } from '../engine/clubStrength';
import { buildCupBracket } from '../engine/cup';
import { simulateMatch } from '../engine/match';
import type { CandidateClub } from '../engine/market';
import { createRng } from '../engine/rng';
import { leagueTable } from '../engine/standings';
import type { RivalSnapshot, SeasonRecord } from '../engine/types';
import { Classifica } from './Classifica';
import { Giornale } from './Giornale';
import { Partita } from './Partita';
import { Resoconto } from './Resoconto';
import { Tabellone } from './Tabellone';

type Tappa = 'partita' | 'classifica' | 'coppa' | 'resoconto' | 'giornale';

/**
 * La stagione non finisce con una riga di numeri: si guarda la partita che conta,
 * si legge la classifica, si vede il tabellone, si scopre quanto si è cresciuti,
 * e solo alla fine arriva il giornale. È il ritmo che rende una carriera una storia.
 */
export function FineStagione({
  record,
  previous,
  rival,
  clubs,
  playerName,
  seed,
  onEnd,
}: {
  record: SeasonRecord;
  previous: SeasonRecord | undefined;
  rival: RivalSnapshot | null;
  clubs: readonly CandidateClub[];
  playerName: string;
  seed: number;
  onEnd: () => void;
}) {
  const dellaLega = useMemo(
    () => clubs.filter((entry) => entry.leagueId === record.leagueId).map((entry) => entry.club),
    [clubs, record.leagueId],
  );

  const coppa = record.trophies.find((trofeo) => trofeo.kind !== 'league');
  const giocaLaCoppa = coppa !== undefined || record.position <= 4;


  // Tutto deterministico dal seed della carriera e dalla stagione: rigiocando si rivede uguale.
  const rng = useMemo(() => createRng(seed * 7919 + record.season), [seed, record.season]);

  const partita = useMemo(() => {
    if (dellaLega.length < 2) return null;
    const mio = dellaLega.find((club) => club.id === record.clubId);
    const avversario = [...dellaLega]
      .filter((club) => club.id !== record.clubId)
      .sort((a, b) => clubStrength(b) - clubStrength(a))[0];
    if (!mio || !avversario) return null;
    // Se c'è un trofeo in ballo la partita è una finale: non può finire in parità.
    const finale = coppa !== undefined;
    return {
      match: simulateMatch(
        {
          home: mio.name,
          away: avversario.name,
          homeStrength: clubStrength(mio),
          awayStrength: clubStrength(avversario),
          playerAtHome: true,
          playerOverall: record.overallEnd,
          playerRole: 'FWD',
          importance: finale ? 1.5 : 1.2,
          knockout: finale,
        },
        createRng(seed * 104729 + record.season),
      ),
      homeOverall: clubStrength(mio),
      awayOverall: clubStrength(avversario),
      finale,
    };
  }, [dellaLega, record.clubId, record.overallEnd, record.season, seed, coppa]);

  const [tappa, setTappa] = useState<Tappa>(partita ? 'partita' : 'classifica');

  const classifica = useMemo(
    () => (dellaLega.length > 1 ? leagueTable(dellaLega, record.clubId, record.position, rng) : []),
    [dellaLega, record.clubId, record.position, rng],
  );

  const bracket = useMemo(
    () =>
      giocaLaCoppa && dellaLega.length >= 8
        ? buildCupBracket(
            coppa?.competitionName ?? 'Coppa Nazionale',
            dellaLega,
            record.clubId,
            coppa !== undefined,
            createRng(seed * 31337 + record.season),
          )
        : null,
    [giocaLaCoppa, dellaLega, coppa, record.clubId, record.season, seed],
  );

  const avanti = (): void => {
    if (tappa === 'partita') setTappa(classifica.length > 0 ? 'classifica' : 'resoconto');
    else if (tappa === 'classifica') setTappa(bracket ? 'coppa' : 'resoconto');
    else if (tappa === 'coppa') setTappa('resoconto');
    else if (tappa === 'resoconto') setTappa('giornale');
    else onEnd();
  };

  if (tappa === 'partita' && partita) {
    return (
      <Partita
        match={partita.match}
        playerAtHome
        homeOverall={partita.homeOverall}
        awayOverall={partita.awayOverall}
        titolo={
          partita.finale
            ? `${coppa?.competitionName ?? 'Coppa'} · finale`
            : `${record.leagueName} · la partita della stagione`
        }
        onEnd={avanti}
      />
    );
  }

  if (tappa === 'classifica') {
    return (
      <>
        <Classifica rows={classifica} leagueName={record.leagueName} />
        <button type="button" className="avanti" onClick={avanti}>
          <span>{bracket ? 'Vai alla coppa' : 'Vai al resoconto'}</span>
          <span className="scorciatoia"><b>Spazio</b> →</span>
        </button>
      </>
    );
  }

  if (tappa === 'coppa' && bracket) {
    return (
      <>
        <Tabellone bracket={bracket} />
        <button type="button" className="avanti" onClick={avanti}>
          <span>Vai al resoconto</span>
          <span className="scorciatoia"><b>Spazio</b> →</span>
        </button>
      </>
    );
  }

  if (tappa === 'resoconto') {
    return <Resoconto record={record} rival={rival} onEnd={avanti} />;
  }

  return (
    <>
      <Giornale
        record={record}
        previous={previous}
        isFirst={record.season === 1}
        playerName={playerName}
        rival={rival}
      />
      <button type="button" className="avanti" onClick={onEnd}>
        <span>Avanti alla prossima decisione</span>
        <span className="scorciatoia"><b>Spazio</b> →</span>
      </button>
    </>
  );
}
