'use client';

import { useEffect, useState } from 'react';
import { dailyChallenge } from '../engine/challenge';
import type { CareerResult, GoatComponent } from '../engine/types';
import { Traguardi } from './Traguardi';
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

export function Verdetto({ result }: { result: CareerResult }) {
  const gol = result.seasons.reduce((sum, season) => sum + season.stats.goals, 0);
  const presenze = result.seasons.reduce((sum, season) => sum + season.stats.appearances, 0);
  const davanti = result.seasonsAheadOfRival > result.seasons.length / 2;
  const [nuovi, setNuovi] = useState<readonly string[]>([]);

  // I traguardi si registrano una volta sola, quando la carriera è davvero finita.
  useEffect(() => {
    setNuovi(registraTraguardi(window.localStorage, result));
  }, [result]);

  const sfida = dailyChallenge(new Date().toISOString().slice(0, 10));

  return (
    <>
    <div className="card" style={{ borderColor: 'var(--tabellone)' }}>
      <h2>Ritirato a {result.retiredAt} anni</h2>
      <p className="numero" style={{ fontSize: '2.6rem', fontWeight: 700, margin: '.2rem 0' }}>
        {result.goat.total}
        <span className="tenue" style={{ fontSize: '1rem', fontWeight: 400 }}> / 1000</span>
      </p>

      <div className="riga numero">
        <span>{presenze} presenze</span>
        <span>{gol} gol</span>
        <span>{result.trophies.length} trofei</span>
        <span>{result.totalCaps} in nazionale</span>
      </div>

      <p style={{ marginTop: '.8rem' }}>
        {davanti
          ? `Hai chiuso davanti a ${result.rival.name}.`
          : `${result.rival.name} ti è rimasto davanti.`}{' '}
        <span className="tenue">
          Lui: picco {result.rival.peakOverall}, {result.rival.goals} gol, {result.rival.trophies} trofei.
        </span>
      </p>

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
    </div>

    <Traguardi evidenzia={nuovi} />
    </>
  );
}

/** A che punto è arrivata questa carriera rispetto alla sfida di oggi. */
function esitoSfida(result: CareerResult, unit: string, target: number): string {
  const fatto =
    unit === 'gol' ? result.seasons.reduce((s, st) => s + st.stats.goals, 0)
    : unit === 'assist' ? result.seasons.reduce((s, st) => s + st.stats.assists, 0)
    : unit === 'presenze' ? result.seasons.reduce((s, st) => s + st.stats.appearances, 0)
    : unit === 'club' ? result.clubsPlayed.length
    : unit === 'punti' ? result.goat.total
    : unit === 'overall' ? result.peakOverall
    : result.seasons.length;

  return fatto >= target
    ? `Centrata: ${fatto} ${unit} contro ${target} richiesti.`
    : `Non ci siamo: ${fatto} ${unit} su ${target}. Ne serve un'altra.`;
}
