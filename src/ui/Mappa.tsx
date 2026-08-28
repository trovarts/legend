'use client';

import { useMemo, useState } from 'react';
import { bandiera, inItaliano } from './bandiere';
import { CONTINENTI, continenteDi } from './continenti';
import { WORLD_PATHS } from './worldPaths';

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
  const [continente, setContinente] = useState(0);

  const accesi = useMemo(() => new Set(giocabili), [giocabili]);
  const filtro = cerca.trim().toLowerCase();

  const quiSopra = CONTINENTI[continente] ?? CONTINENTI[0]!;

  /**
   * Cercando si guarda ovunque; senza cercare si guarda il continente inquadrato.
   * Così l'elenco sotto la mappa resta corto e ha lo stesso contenuto di quello che
   * si vede: niente più ventotto bottoni tutti insieme.
   */
  const elenco = useMemo(
    () =>
      [...giocabili]
        .filter((paese) =>
          filtro === ''
            ? continenteDi(paese) === quiSopra.id
            : inItaliano(paese).toLowerCase().includes(filtro),
        )
        .sort((a, b) => inItaliano(a).localeCompare(inItaliano(b))),
    [giocabili, filtro, quiSopra.id],
  );

  const quantiQui = useMemo(
    () => giocabili.filter((paese) => continenteDi(paese) === quiSopra.id).length,
    [giocabili, quiSopra.id],
  );

  const giraDi = (passo: number): void => {
    setCerca('');
    setContinente((corrente) => (corrente + passo + CONTINENTI.length) % CONTINENTI.length);
  };

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
      <div className="giostra">
        <button type="button" className="giostra-freccia" aria-label="Continente precedente" onClick={() => giraDi(-1)}>‹</button>
        <span className="giostra-nome">{quiSopra.nome}</span>
        <button type="button" className="giostra-freccia" aria-label="Continente successivo" onClick={() => giraDi(1)}>›</button>
      </div>

      <p className="tenue giostra-conto">
        {sopra !== null
          ? inItaliano(sopra)
          : `${quantiQui} ${quantiQui === 1 ? 'nazione giocabile' : 'nazioni giocabili'} qui · ${giocabili.length} in tutto`}
      </p>

      <svg
        viewBox={quiSopra.viewBox}
        className="mappa mappa-zoom"
        role="group"
        aria-label={`Mappa: ${quiSopra.nome}. Tocca una nazione accesa.`}
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
