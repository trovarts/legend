'use client';

import { useEffect, useRef, useState } from 'react';
import { ambizioneById, progressoAmbizione } from '../engine/ambizione';
import { dailyChallenge } from '../engine/challenge';
import type { CareerResult, GoatComponent } from '../engine/types';
import { Albo } from './Albo';
import type { Aspetto } from './Avatar';
import { Confronto } from './Confronto';
import { Poster } from './Poster';
import { registraNellAlbo } from './alboSalvato';
import { Traguardi } from './Traguardi';
import { registraSfida } from './sfidaSalvata';
import { registraTraguardi } from './traguardiSalvati';

const ETICHETTE: Record<GoatComponent, string> = {
  performance: 'Rendimento',
  trophies: 'Trofei',
  awards: 'Premi individuali',
  national: 'Nazionale',
  peakOverall: 'Picco',
  peakValue: 'Valore massimo',
  longevity: 'Longevità',
  rival: 'Confronto col rivale',
  difficulty: 'Difficoltà del percorso',
};

export function Verdetto({
  result,
  ambizioneId,
  paeseDelClub,
  nome,
  nazionalita,
  look,
  numero,
}: {
  result: CareerResult;
  /** Cosa aveva promesso questa carriera quando è cominciata. */
  ambizioneId?: string;
  paeseDelClub?: (clubId: string) => string | undefined;
  /** Serve solo al manifesto: nome, bandiera e faccia. */
  nome?: string;
  nazionalita?: string;
  look?: Aspetto;
  numero?: string;
}) {
  const ambizione = ambizioneById(ambizioneId);
  const promessa = progressoAmbizione(ambizione, result.seasons, paeseDelClub ?? (() => undefined));
  const gol = result.seasons.reduce((sum, season) => sum + season.stats.goals, 0);
  const presenze = result.seasons.reduce((sum, season) => sum + season.stats.appearances, 0);
  const [nuovi, setNuovi] = useState<readonly string[]>([]);
  const [posto, setPosto] = useState<number | undefined>(undefined);
  const [striscia, setStriscia] = useState(0);
  const registrato = useRef(false);

  const oggi = new Date().toISOString().slice(0, 10);
  const sfida = dailyChallenge(oggi);
  const centrata = quantoFatto(result, sfida.unit) >= sfida.target;

  // Una volta sola per carriera finita. La carriera si rigioca dal seed a ogni
  // disegno, quindi `result` è un oggetto nuovo ogni volta: senza questa guardia
  // i traguardi verrebbero registrati subito e non risulterebbero mai nuovi.
  useEffect(() => {
    if (registrato.current) return;
    registrato.current = true;
    setNuovi(registraTraguardi(window.localStorage, result));
    setPosto(registraNellAlbo(window.localStorage, result, Date.now()) ?? undefined);
    setStriscia(registraSfida(window.localStorage, oggi, centrata));
  }, [result, oggi, centrata]);

  return (
    <>
    <div className="card" style={{ borderColor: 'var(--tabellone)' }}>
      <h2>Ritirato a {result.retiredAt} anni</h2>
      <p className="numero" style={{ fontSize: '2.6rem', fontWeight: 700, margin: '.2rem 0' }}>
        {result.goat.total + (promessa.centrata ? ambizione.premio : 0)}
        <span className="tenue" style={{ fontSize: '1rem', fontWeight: 400 }}> / 1000</span>
      </p>

      {ambizione.id !== 'nessuna' && (
        <p className={`ambizione-verdetto${promessa.centrata ? ' ambizione-centrata' : ''}`}>
          <b>{ambizione.titolo}</b>{' '}
          {promessa.centrata
            ? `— promessa mantenuta. +${ambizione.premio} punti.`
            : `— rimasta a ${Math.round(promessa.fatto)} su ${ambizione.target} ${ambizione.unita}.`}
        </p>
      )}

      <div className="riga numero">
        <span>{presenze} presenze</span>
        <span>{gol} gol</span>
        <span>{result.trophies.length} trofei</span>
        <span>{result.totalCaps} in nazionale</span>
      </div>

      <p className="tenue">Squadre: {result.clubsPlayed.join(' → ')}</p>

      {result.marks.length > 0 && (
        <p className="posta">
          Quello che si sono ricordati di te:{' '}
          {result.marks.map((mark) => mark.id.replace(/-/g, ' ')).join(', ')}
        </p>
      )}

      <div style={{ marginTop: '1rem' }}>
        {(Object.keys(ETICHETTE) as GoatComponent[]).map((key) => (
          <div key={key} className="riga">
            <span className="tenue">{ETICHETTE[key]}</span>
            <span className="numero">{Math.round(result.goat.components[key])}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="card">
      <span className="contesto-etichetta">Sfida di oggi · {sfida.title}</span>
      <p style={{ margin: '.3rem 0 0' }}>{sfida.text}</p>
      <p className="tenue" style={{ margin: '.2rem 0 0', fontSize: '.85rem' }}>
        {esitoSfida(result, sfida.unit, sfida.target)}
      </p>
      {centrata && striscia > 0 && (
        <p className="sfida-striscia" style={{ margin: '.35rem 0 0' }}>
          🔥 {striscia} {striscia === 1 ? 'giorno' : 'giorni'} di fila
        </p>
      )}
    </div>

    {posto === 1 && (
      <p className="trofeo" style={{ margin: 0 }}>
        ★ È la carriera più forte che hai chiuso finora.
      </p>
    )}

    <Confronto result={result} nome={nome ?? 'Il tuo giocatore'} />

    {nome !== undefined && nazionalita !== undefined && (
      <Poster
        result={result}
        nome={nome}
        nazionalita={nazionalita}
        look={look}
        numero={numero}
        ambizioneId={ambizioneId}
      />
    )}

    <Albo evidenzia={posto} />
    <Traguardi evidenzia={nuovi} />
    </>
  );
}

/** Quanto ha prodotto questa carriera nell'unità che la sfida chiede. */
function quantoFatto(result: CareerResult, unit: string): number {
  return unit === 'gol' ? result.seasons.reduce((s, st) => s + st.stats.goals, 0)
    : unit === 'assist' ? result.seasons.reduce((s, st) => s + st.stats.assists, 0)
    : unit === 'presenze' ? result.seasons.reduce((s, st) => s + st.stats.appearances, 0)
    : unit === 'club' ? result.clubsPlayed.length
    : unit === 'punti' ? result.goat.total
    : unit === 'overall' ? result.peakOverall
    : result.seasons.length;
}

/** A che punto è arrivata questa carriera rispetto alla sfida di oggi. */
function esitoSfida(result: CareerResult, unit: string, target: number): string {
  const fatto = quantoFatto(result, unit);

  return fatto >= target
    ? `Centrata: ${fatto} ${unit} contro ${target} richiesti.`
    : `Non ci siamo: ${fatto} ${unit} su ${target}. Ne serve un'altra.`;
}
