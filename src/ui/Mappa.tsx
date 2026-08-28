'use client';

import { useMemo, useState } from 'react';
import { bandiera, inItaliano } from './bandiere';
import { MAP_HEIGHT, MAP_WIDTH, WORLD_PATHS } from './worldPaths';

/** I nomi della mappa non coincidono sempre con quelli del database delle rose. */
const ALIAS: Record<string, string> = {
  'United States of America': 'United States',
  'Republic of Korea': 'Korea Republic',
  'Republic of Serbia': 'Serbia',
  'Czechia': 'Czech Republic',
  'Turkey': 'Türkiye',
  Ireland: 'Republic of Ireland',
  China: 'China PR',
  'United Kingdom': 'England',
};

function chiaveDi(nomeMappa: string): string {
  return ALIAS[nomeMappa] ?? nomeMappa;
}

/**
 * Il planisfero su cui si sceglie da dove cominciare: i paesi giocabili sono accesi,
 * gli altri restano spenti. Le forme sono generate a build-time, nessuna libreria.
 */
export function Mappa({
  giocabili,
  scelto,
  onChoose,
}: {
  giocabili: readonly string[];
  /** Il paese gia' scelto resta acceso mentre leggi la sua scheda. */
  scelto?: string;
  onChoose: (paese: string) => void;
}) {
  const [cerca, setCerca] = useState('');
  const [sopra, setSopra] = useState<string | null>(null);

  const accesi = useMemo(() => new Set(giocabili), [giocabili]);
  const filtro = cerca.trim().toLowerCase();

  const elenco = useMemo(
    () =>
      [...giocabili]
        .filter((paese) => filtro === '' || inItaliano(paese).toLowerCase().includes(filtro))
        .sort((a, b) => inItaliano(a).localeCompare(inItaliano(b))),
    [giocabili, filtro],
  );

  return (
    <div className="mappa-blocco">
      <label htmlFor="cerca-nazione" className="contesto-etichetta">Cerca nazionalità</label>
      <input
        id="cerca-nazione"
        className="bottone"
        style={{ marginTop: '.35rem' }}
        value={cerca}
        onChange={(event) => setCerca(event.target.value)}
        placeholder="Scrivi una nazione"
      />
      <p className="tenue" style={{ fontSize: '.78rem', margin: '.5rem 0' }}>
        Nazioni giocabili in arancione · {giocabili.length} disponibili
        {sopra !== null && ` · ${inItaliano(sopra)}`}
      </p>

      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="mappa"
        role="group"
        aria-label="Mappa del mondo: scegli una nazione"
      >
        {WORLD_PATHS.map((paese) => {
          const chiave = chiaveDi(paese.name);
          const attivo = accesi.has(chiave);
          return (
            <path
              key={paese.name}
              d={paese.d}
              className={`paese-mappa${attivo ? ' paese-attivo' : ''}${chiave === scelto ? ' paese-scelto' : ''}`}
              onClick={attivo ? () => onChoose(chiave) : undefined}
              onMouseEnter={attivo ? () => setSopra(chiave) : undefined}
              onMouseLeave={() => setSopra(null)}
            >
              {attivo && <title>{inItaliano(chiave)}</title>}
            </path>
          );
        })}
      </svg>

      <div className="paesi" style={{ marginTop: '.7rem' }}>
        {elenco.map((paese) => (
          <button
            key={paese}
            type="button"
            className={`paese${paese === scelto ? ' bottone-scelto' : ''}`}
            onClick={() => onChoose(paese)}
          >
            <span className="paese-bandiera" aria-hidden="true">{bandiera(paese)}</span>
            <span>{inItaliano(paese)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
