'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MatchEvent, MatchResult } from '../engine/match';
import type { ModoPartita } from './preferenze';
import { temaDelClub } from './temaClub';
import { sigla } from './Scelte';

const VELOCITA = [0.75, 1, 1.5, 2, 8] as const;
/** Millisecondi per minuto di gioco a velocità 1. */
const PASSO = 55;

function banner(evento: MatchEvent | undefined): { etichetta: string; testo: string; tono: string } {
  if (!evento) return { etichetta: '', testo: 'In attesa del primo episodio…', tono: 'neutro' };
  switch (evento.kind) {
    case 'gol': return { etichetta: `${evento.minute}'`, testo: 'GOL!', tono: 'bene' };
    case 'gol-subito': return { etichetta: `${evento.minute}'`, testo: 'Gol subito', tono: 'male' };
    case 'parata': return { etichetta: `${evento.minute}'`, testo: 'Grande parata', tono: 'neutro' };
    case 'palo': return { etichetta: `${evento.minute}'`, testo: 'Palo!', tono: 'neutro' };
    case 'occasione': return { etichetta: `${evento.minute}'`, testo: 'Occasione sprecata', tono: 'neutro' };
    case 'cartellino': return { etichetta: `${evento.minute}'`, testo: 'Ammonizione', tono: 'male' };
    case 'intervallo': return { etichetta: 'HT', testo: 'Intervallo', tono: 'neutro' };
    case 'supplementari': return { etichetta: 'SUPP', testo: 'Si va ai supplementari', tono: 'neutro' };
    case 'rigore': return { etichetta: 'RIG', testo: 'Rigore segnato', tono: 'bene' };
    case 'rigore-sbagliato': return { etichetta: 'RIG', testo: 'Rigore sbagliato!', tono: 'male' };
    case 'fine': return { etichetta: 'FT', testo: 'Fine partita', tono: 'neutro' };
    default: return { etichetta: '', testo: 'Si comincia', tono: 'neutro' };
  }
}

/**
 * La partita che scorre davanti agli occhi: cronometro, punteggio che cambia,
 * statistiche che si muovono, e i rigori quando una finale non vuole finire.
 * È già tutta decisa dal motore — qui la si guarda.
 */
export function Partita({
  match,
  playerAtHome,
  titolo,
  homeOverall,
  awayOverall,
  modo,
  onEnd,
}: {
  match: MatchResult;
  playerAtHome: boolean;
  titolo: string;
  homeOverall: number;
  awayOverall: number;
  /** In classica la partita si apre già finita: c'è solo il tabellino. */
  modo: ModoPartita;
  onEnd: () => void;
}) {
  const durata = match.penalties !== null || match.events.some((e) => e.kind === 'supplementari') ? 120 : 90;
  const [minuto, setMinuto] = useState(modo === 'classica' ? durata : 0);
  const [tiriMostrati, setTiriMostrati] = useState(
    modo === 'classica' ? (match.penalties?.shots.length ?? 0) : 0,
  );
  const [velocita, setVelocita] = useState<number>(2);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);


  const tiriTotali = match.penalties?.shots.length ?? 0;
  const finitiTempi = minuto >= durata;
  const finita = finitiTempi && tiriMostrati >= tiriTotali;

  useEffect(() => {
    if (finitiTempi || modo === 'classica') return undefined;
    timer.current = setInterval(() => setMinuto((m) => Math.min(durata, m + 1)), PASSO / velocita);
    return () => {
      if (timer.current !== null) clearInterval(timer.current);
    };
  }, [velocita, finitiTempi, durata, modo]);

  // Finiti i tempi, i rigori scorrono uno alla volta: è lì che si soffre.
  useEffect(() => {
    if (!finitiTempi || tiriMostrati >= tiriTotali) return undefined;
    const timeout = setTimeout(() => setTiriMostrati((n) => n + 1), 900 / velocita);
    return () => clearTimeout(timeout);
  }, [finitiTempi, tiriMostrati, tiriTotali, velocita]);

  const temaCasa = temaDelClub(match.home);
  const temaOspite = temaDelClub(match.away);

  const accaduti = useMemo(
    () => match.events.filter((event) => event.minute <= minuto && event.kind !== 'inizio'),
    [match.events, minuto],
  );

  const gol = useMemo(() => {
    let casa = 0;
    let ospite = 0;
    for (const event of match.events) {
      if (event.minute > minuto) break;
      if (event.kind !== 'gol' && event.kind !== 'gol-subito') continue;
      if (event.mine === playerAtHome) casa += 1;
      else ospite += 1;
    }
    return [casa, ospite] as const;
  }, [match.events, minuto, playerAtHome]);

  const parziali = useMemo(() => {
    const conta: Record<'tiri' | 'inPorta' | 'corner' | 'falli', [number, number]> = {
      tiri: [0, 0], inPorta: [0, 0], corner: [0, 0], falli: [0, 0],
    };
    for (const event of match.events) {
      if (event.minute > minuto) break;
      const casa = event.mine === playerAtHome ? 0 : 1;
      const altro = casa === 0 ? 1 : 0;
      if (event.kind === 'gol' || event.kind === 'gol-subito') {
        conta.tiri[casa] += 1;
        conta.inPorta[casa] += 1;
      } else if (event.kind === 'parata') {
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

  const ultimo = finitiTempi && tiriTotali > 0 && tiriMostrati > 0
    ? { ...match.events[match.events.length - 1]!, kind: (match.penalties!.shots[tiriMostrati - 1]!.scored ? 'rigore' : 'rigore-sbagliato') as MatchEvent['kind'] }
    : accaduti[accaduti.length - 1];
  const striscia = banner(finita ? { minute: durata, kind: 'fine', mine: false, text: '' } : ultimo);

  const rigoriCasa = match.penalties?.shots.filter((_, i) => i % 2 === 0).slice(0, Math.ceil(tiriMostrati / 2)) ?? [];
  const rigoriOspite = match.penalties?.shots.filter((_, i) => i % 2 === 1).slice(0, Math.floor(tiriMostrati / 2)) ?? [];

  return (
    <section className="giornale partita">
      <div className="partita-testa">
        <span className="partita-fase">
          {finita ? 'FINALE' : tiriTotali > 0 && finitiTempi ? 'RIG' : minuto > 90 ? 'SUPP' : `${minuto}'`}
        </span>
        <span className="testata-data">
          {modo === 'dettagliata' &&
            VELOCITA.map((v) => (
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
      </div>

      <div className="tabellino">
        <span className="squadra">
          <span className="squadra-stemma" style={{ background: temaCasa.primario, color: temaCasa.chiaro ? '#1a1a1a' : '#fff' }}>
            {sigla(match.home)}
          </span>
          <b>{match.home}</b>
          <span className="squadra-ovr">OVR {homeOverall.toFixed(0)}</span>
        </span>

        <span className="tabellino-punteggio numero">
          <b>{gol[0]}</b>
          <span className="tabellino-trattino">—</span>
          <b>{gol[1]}</b>
          {match.penalties !== null && tiriMostrati > 0 && (
            <span className="tabellino-rigori">
              ({rigoriCasa.filter((t) => t.scored).length}–{rigoriOspite.filter((t) => t.scored).length})
            </span>
          )}
        </span>

        <span className="squadra">
          <span className="squadra-stemma" style={{ background: temaOspite.primario, color: temaOspite.chiaro ? '#1a1a1a' : '#fff' }}>
            {sigla(match.away)}
          </span>
          <b>{match.away}</b>
          <span className="squadra-ovr">OVR {awayOverall.toFixed(0)}</span>
        </span>
      </div>

      <div className="tempo-barra" aria-hidden="true">
        <span style={{ width: `${(minuto / durata) * 100}%` }} />
      </div>

      <div className={`striscia striscia-${striscia.tono}`}>
        {striscia.etichetta !== '' && <b>{striscia.etichetta}</b>}
        <span>{striscia.testo}</span>
      </div>

      <div className="partita-corpo">
        <div className="stat-lista">
          <div className="stat-intestazione">
            <span>Casa</span><span>Statistiche</span><span>Trasferta</span>
          </div>
          {([
            ['Possesso', match.stats.possesso, '%'],
            ['Tiri', parziali.tiri, ''],
            ['Tiri in porta', parziali.inPorta, ''],
            ["Calci d'angolo", parziali.corner, ''],
            ['Falli', parziali.falli, ''],
          ] as const).map(([nome, valori, unita]) => {
            const casa = valori[0]!;
            const ospite = valori[1]!;
            const totale = Math.max(1, casa + ospite);
            return (
              <div key={nome} className="stat-riga">
                <span className="numero">{casa}{unita}</span>
                <span className="stat-centro">
                  <span className="stat-nome">{nome}</span>
                  <span className="stat-barra">
                    {/* I colori sono quelli dei due stemmi: la barra si legge senza legenda. */}
                    <span
                      className="stat-casa"
                      style={{ width: `${(casa / totale) * 100}%`, background: temaCasa.primario }}
                    />
                    <span
                      className="stat-ospite"
                      style={{ width: `${(ospite / totale) * 100}%`, background: temaOspite.primario }}
                    />
                  </span>
                </span>
                <span className="numero">{ospite}{unita}</span>
              </div>
            );
          })}
        </div>

        {match.penalties !== null && finitiTempi ? (
          <div className="rigori">
            <div className="rigori-riga">
              <span className="contesto-etichetta">{playerAtHome ? 'Noi' : 'Loro'}</span>
              {rigoriCasa.map((tiro, indice) => (
                <span key={indice} className={`rigore-segno${tiro.scored ? ' rigore-dentro' : ' rigore-fuori'}`}>
                  {tiro.scored ? '●' : '✕'}
                </span>
              ))}
            </div>
            <div className="rigori-riga">
              <span className="contesto-etichetta">{playerAtHome ? 'Loro' : 'Noi'}</span>
              {rigoriOspite.map((tiro, indice) => (
                <span key={indice} className={`rigore-segno${tiro.scored ? ' rigore-dentro' : ' rigore-fuori'}`}>
                  {tiro.scored ? '●' : '✕'}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="cronaca">
            {accaduti.length === 0 ? (
              <p className="tenue">In attesa del primo episodio…</p>
            ) : (
              [...accaduti].reverse().slice(0, 5).map((event, index) => (
                <p key={`${event.minute}-${index}`} className={`cronaca-riga${event.kind === 'gol' ? ' cronaca-gol' : ''}`}>
                  {event.text}
                </p>
              ))
            )}
          </div>
        )}
      </div>

      <button type="button" className="avanti" onClick={finita ? onEnd : () => { setMinuto(durata); setTiriMostrati(tiriTotali); }}>
        <span>{finita ? 'Vai al resoconto' : 'Salta al risultato'}</span>
        <span className="scorciatoia"><b>Spazio</b> →</span>
      </button>
    </section>
  );
}
