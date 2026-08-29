'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { CupBracket, CupRound } from '../engine/cup';

const TITOLI: Record<CupRound, string> = {
  quarti: 'Quarti',
  semifinale: 'Semifinale',
  finale: 'Finale',
};

const TURNI: readonly CupRound[] = ['quarti', 'semifinale', 'finale'];

/** Ogni accoppiamento esce in due tempi: prima chi contro chi, poi com'è finita. */
const PASSO_MS = 340;

export function Tabellone({ bracket }: { bracket: CupBracket }) {
  /*
   * Il tabellone non compare: viene sorteggiato.
   *
   * Un tabellone che appare tutto insieme è un tabellone da leggere; uno che esce
   * accoppiamento per accoppiamento, scorrendo da solo, è un sorteggio da guardare.
   * È l'ultima cosa che il riferimento faceva e noi no.
   */
  const ordine = useMemo(
    () => TURNI.flatMap((turno) => bracket.ties.filter((tie) => tie.round === turno)),
    [bracket],
  );
  const passiTotali = ordine.length * 2;

  // Chi ha chiesto meno animazioni vede il tabellone finito: il sorteggio è un lusso.
  const [ridotto, setRidotto] = useState(false);
  const [passo, setPasso] = useState(0);
  const finito = passo >= passiTotali || ridotto;

  const contenitore = useRef<HTMLDivElement | null>(null);
  const ultimo = useRef<HTMLDivElement | null>(null);
  const mia = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRidotto(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (ridotto || passo >= passiTotali) return undefined;
    const timer = setTimeout(() => setPasso((corrente) => corrente + 1), PASSO_MS);
    return () => clearTimeout(timer);
  }, [passo, passiTotali, ridotto]);

  // L'accoppiamento appena uscito si porta sotto gli occhi da solo.
  useEffect(() => {
    if (ridotto || passo === 0 || passo > passiTotali) return;
    ultimo.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [passo, passiTotali, ridotto]);

  // A sorteggio concluso resta in vista la riga che riguarda te.
  useEffect(() => {
    if (!finito) return undefined;
    const quando = setTimeout(() => {
      mia.current?.scrollIntoView({ block: 'center', behavior: ridotto ? 'auto' : 'smooth' });
    }, ridotto ? 0 : 420);
    return () => clearTimeout(quando);
  }, [finito, ridotto]);

  const indiceDi = (tie: (typeof ordine)[number]): number => ordine.indexOf(tie);

  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">{bracket.name.toUpperCase()}</span>
        <span className="testata-data">
          {finito
            ? bracket.reached === 'vittoria' ? 'trofeo alzato' : `fuori a: ${bracket.reached}`
            : 'sorteggio in corso'}
        </span>
      </header>

      <div className="tabellone" ref={contenitore}>
        {TURNI.map((turno) => {
          const partite = bracket.ties.filter((tie) => tie.round === turno);
          if (partite.length === 0) return null;
          const turnoVisibile = finito || partite.some((tie) => indiceDi(tie) * 2 < passo);
          return (
            <div key={turno} className={`tabellone-colonna${turnoVisibile ? '' : ' tabellone-colonna-attesa'}`}>
              <span className="contesto-etichetta">{TITOLI[turno]}</span>
              {partite.map((tie, index) => {
                const posto = indiceDi(tie);
                const uscito = finito || passo > posto * 2;
                const conPunteggio = finito || passo > posto * 2 + 1;
                const appenaUscito = !finito && passo === posto * 2 + 1;
                return (
                  <div
                    key={`${turno}-${index}`}
                    ref={(elemento) => {
                      if (tie.playerInvolved) mia.current = elemento;
                      if (appenaUscito) ultimo.current = elemento;
                    }}
                    className={
                      `tie${tie.playerInvolved ? ' tie-mia' : ''}`
                      + (uscito ? ' tie-uscita' : ' tie-coperta')
                    }
                    aria-hidden={uscito ? undefined : true}
                  >
                    <span className={conPunteggio && tie.homeGoals > tie.awayGoals ? 'tie-vince' : ''}>
                      {uscito ? tie.home : '—'}
                      <b className="numero">{conPunteggio ? tie.homeGoals : '·'}</b>
                    </span>
                    <span className={conPunteggio && tie.awayGoals > tie.homeGoals ? 'tie-vince' : ''}>
                      {uscito ? tie.away : '—'}
                      <b className="numero">{conPunteggio ? tie.awayGoals : '·'}</b>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {!finito && (
        <button type="button" className="tabellone-salta" onClick={() => setPasso(passiTotali)}>
          Mostra il tabellone
        </button>
      )}

      {finito && bracket.reached === 'vittoria' && (
        <p className="trofeo entra">🏆 {bracket.winner} alza la coppa.</p>
      )}
    </section>
  );
}
