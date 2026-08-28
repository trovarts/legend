'use client';

import type { CareerResult, GoatComponent } from '../engine/types';

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

  return (
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
  );
}
