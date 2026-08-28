'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MatchResult } from '../engine/match';

const VELOCITA = [0.75, 1, 2, 4, 8] as const;
/** Millisecondi per minuto di gioco a velocità 1. */
const PASSO = 55;

/**
 * La partita che scorre davanti agli occhi: cronometro, punteggio che cambia,
 * statistiche che si muovono. È già tutta decisa dal motore — qui la si guarda.
 */
export function Partita({
  match,
  playerAtHome,
  titolo,
  onEnd,
}: {
  match: MatchResult;
  playerAtHome: boolean;
  titolo: string;
  onEnd: () => void;
}) {
  const [minuto, setMinuto] = useState(0);
  const [velocita, setVelocita] = useState<number>(2);
  const finita = minuto >= 90;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (finita) return undefined;
    timer.current = setInterval(() => setMinuto((m) => Math.min(90, m + 1)), PASSO / velocita);
    return () => {
      if (timer.current !== null) clearInterval(timer.current);
    };
  }, [velocita, finita]);

  const accaduti = useMemo(
    () => match.events.filter((event) => event.minute <= minuto && event.kind !== 'inizio'),
    [match.events, minuto],
  );

  const gol: [number, number] = useMemo(() => {
    let casa = 0;
    let ospite = 0;
    for (const event of match.events) {
      if (event.minute > minuto) break;
      if (event.kind !== 'gol' && event.kind !== 'gol-subito') continue;
      const inCasa = event.mine === playerAtHome;
      if (inCasa) casa += 1;
      else ospite += 1;
    }
    return [casa, ospite];
  }, [match.events, minuto, playerAtHome]);

  // Le statistiche si contano dagli episodi già accaduti: scalare il totale finale
  // faceva vedere zero tiri in porta con un gol già segnato.
  const parziali = useMemo(() => {
    const conta: Record<'tiri' | 'inPorta' | 'corner' | 'falli', [number, number]> = {
      tiri: [0, 0], inPorta: [0, 0], corner: [0, 0], falli: [0, 0],
    };
    for (const event of match.events) {
      if (event.minute > minuto) break;
      const casa = event.mine === playerAtHome ? 0 : 1;
      if (event.kind === 'gol' || event.kind === 'gol-subito') {
        conta.tiri[casa] += 1;
        conta.inPorta[casa] += 1;
      } else if (event.kind === 'parata') {
        const altro = casa === 0 ? 1 : 0;
        conta.tiri[altro] += 1;
        conta.inPorta[altro] += 1;
      } else if (event.kind === 'palo') {
        conta.tiri[casa] += 1;
      } else if (event.kind === 'occasione') {
        conta.tiri[casa] += 1;
        conta.corner[casa] += 1;
      } else if (event.kind === 'cartellino') {
        conta.falli[casa] += 1;
      }
    }
    return conta;
  }, [match.events, minuto, playerAtHome]);

  return (
    <section className="giornale partita">
      <header className="testata">
        <span className="testata-nome">{titolo.toUpperCase()}</span>
        <span className="testata-data">
          {VELOCITA.map((v) => (
            <button
              key={v}
              type="button"
              className={`velocita${velocita === v ? ' velocita-attiva' : ''}`}
              onClick={() => setVelocita(v)}
            >
              {v}×
            </button>
          ))}
        </span>
      </header>

      <div className="tabellino">
        <span className="tabellino-squadra">{match.home}</span>
        <span className="tabellino-punteggio numero">
          <b>{gol[0]}</b>
          <span className="tabellino-minuto">{finita ? 'FINALE' : `${minuto}'`}</span>
          <b>{gol[1]}</b>
        </span>
        <span className="tabellino-squadra">{match.away}</span>
      </div>

      <div className="stat-lista">
        {([
          ['Possesso', match.stats.possesso, '%'],
          ['Tiri', parziali.tiri, ''],
          ['In porta', parziali.inPorta, ''],
          ['Corner', parziali.corner, ''],
          ['Falli', parziali.falli, ''],
        ] as const).map(([nome, valori, unita]) => {
          const casa = valori[0]!;
          const ospite = valori[1]!;
          const totale = Math.max(1, casa + ospite);
          return (
            <div key={nome} className="stat-riga">
              <span className="numero">{casa}{unita}</span>
              <span className="stat-barra">
                <span className="stat-casa" style={{ width: `${(casa / totale) * 100}%` }} />
                <span className="stat-ospite" style={{ width: `${(ospite / totale) * 100}%` }} />
              </span>
              <span className="numero">{ospite}{unita}</span>
              <span className="stat-nome tenue">{nome}</span>
            </div>
          );
        })}
      </div>

      <div className="cronaca">
        {accaduti.length === 0 ? (
          <p className="tenue">In attesa del primo episodio…</p>
        ) : (
          [...accaduti].reverse().slice(0, 6).map((event, index) => (
            <p key={`${event.minute}-${index}`} className={`cronaca-riga${event.kind === 'gol' ? ' cronaca-gol' : ''}`}>
              {event.text}
            </p>
          ))
        )}
      </div>

      <button type="button" className="avanti" onClick={finita ? onEnd : () => setMinuto(90)}>
        <span>{finita ? 'Vai al resoconto' : 'Salta al risultato'}</span>
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
