'use client';

import { useMemo, useState } from 'react';
import { clubStrength } from '../engine/clubStrength';
import { buildCupBracket } from '../engine/cup';
import { simulateMatch } from '../engine/match';
import type { CandidateClub } from '../engine/market';
import { createRng } from '../engine/rng';
import { leagueTable } from '../engine/standings';
import type { RivalSnapshot, SeasonRecord } from '../engine/types';
import { inPlayoffZone } from '../engine/movement';
import { buildPlayoff } from '../engine/promotion';
import { buildWorldCup } from '../engine/worldcup';
import { Classifica } from './Classifica';
import { Mondiale } from './Mondiale';
import { Playoff } from './Playoff';
import { Trofeo } from './Trofeo';
import { Giornale } from './Giornale';
import { Partita } from './Partita';
import type { Role } from '../world/types';
import type { ModoPartita } from './preferenze';
import { Resoconto } from './Resoconto';
import { Tabellone } from './Tabellone';

type Tappa = 'partita' | 'classifica' | 'playoff' | 'coppa' | 'trofeo' | 'mondiale' | 'resoconto' | 'giornale';

/**
 * La stagione non finisce con una riga di numeri: si guarda la partita che conta,
 * si legge la classifica, si vede il tabellone, si scopre quanto si è cresciuti,
 * e solo alla fine arriva il giornale. È il ritmo che rende una carriera una storia.
 */
export function FineStagione({
  record,
  previous,
  before,
  rival,
  clubs,
  playerName,
  role,
  nazione,
  seed,
  modo,
  onEnd,
}: {
  record: SeasonRecord;
  previous: SeasonRecord | undefined;
  /** Le stagioni già giocate: il racconto sa dire «mai così tanti». */
  before?: readonly SeasonRecord[];
  rival: RivalSnapshot | null;
  clubs: readonly CandidateClub[];
  playerName: string;
  role?: Role;
  nazione: string;
  seed: number;
  /** Classica salta il campo e i tabelloni: classifica, trofeo, resoconto, giornale. */
  modo: ModoPartita;
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

  const playoff = useMemo(
    () =>
      inPlayoffZone(record.position, record.leagueLevel) && dellaLega.length >= 4
        ? buildPlayoff(
            record.leagueName, dellaLega, record.clubId,
            createRng(seed * 15485863 + record.season),
            record.movement === 'promosso',
          )
        : null,
    [record.position, record.leagueLevel, record.leagueName, record.clubId, dellaLega, seed, record.season],
  );

  const mondiale = useMemo(
    () =>
      record.national.tournament !== null
        ? buildWorldCup(
            record.national.tournament.name,
            nazione,
            record.overallEnd,
            record.national.tournament.stageReached,
            createRng(seed * 32452843 + record.season),
          )
        : null,
    [record.national.tournament, record.overallEnd, record.season, seed, nazione],
  );

  const [tappa, setTappa] = useState<Tappa>(partita && modo === 'dettagliata' ? 'partita' : 'classifica');

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

  const trofeoDaAlzare = record.trophies[0];

  /** L'ordine in cui si guarda una stagione: dal campo alla prima pagina. */
  const prossima = (corrente: Tappa): Tappa | null => {
    const ordine: Tappa[] = ['partita', 'classifica', 'playoff', 'coppa', 'trofeo', 'mondiale', 'resoconto', 'giornale'];
    // In classica restano le cose che dicono com'è andata: la classifica, la
    // coppa alzata e il racconto. Il campo e i tabelloni si saltano.
    const immersiva = modo === 'dettagliata';
    const disponibile: Record<Tappa, boolean> = {
      partita: immersiva && partita !== null,
      classifica: classifica.length > 0,
      playoff: immersiva && playoff !== null,
      coppa: immersiva && bracket !== null,
      trofeo: trofeoDaAlzare !== undefined,
      mondiale: immersiva && mondiale !== null,
      resoconto: true,
      giornale: true,
    };
    for (let indice = ordine.indexOf(corrente) + 1; indice < ordine.length; indice += 1) {
      const tappaProssima = ordine[indice]!;
      if (disponibile[tappaProssima]) return tappaProssima;
    }
    return null;
  };

  const avanti = (): void => {
    const dopo = prossima(tappa);
    if (dopo === null) onEnd();
    else setTappa(dopo);
  };

  if (tappa === 'partita' && partita && modo === 'dettagliata') {
    return (
      <Partita
        match={partita.match}
        playerAtHome
        homeOverall={partita.homeOverall}
        awayOverall={partita.awayOverall}
        modo={modo}
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
          <span>Avanti</span>
          <span className="scorciatoia"><b>Spazio</b> →</span>
        </button>
      </>
    );
  }

  if (tappa === 'playoff' && playoff) {
    return (
      <>
        <Playoff bracket={playoff} />
        <button type="button" className="avanti" onClick={avanti}>
          <span>Avanti</span>
          <span className="scorciatoia"><b>Spazio</b> →</span>
        </button>
      </>
    );
  }

  if (tappa === 'trofeo' && trofeoDaAlzare) {
    return <Trofeo nome={trofeoDaAlzare.competitionName} club={record.clubName} onEnd={avanti} />;
  }

  if (tappa === 'mondiale' && mondiale) {
    return (
      <>
        <Mondiale run={mondiale} country={nazione} />
        <button type="button" className="avanti" onClick={avanti}>
          <span>Avanti</span>
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
          <span>Avanti</span>
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
        before={before}
        isFirst={record.season === 1}
        playerName={playerName}
        role={role}
        rival={rival}
      />
      <button type="button" className="avanti" onClick={onEnd}>
        <span>Avanti alla prossima decisione</span>
        <span className="scorciatoia"><b>Spazio</b> →</span>
      </button>
    </>
  );
}
