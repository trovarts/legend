'use client';

import { useRef, useState } from 'react';
import { ambizioneById } from '../engine/ambizione';
import type { CareerResult } from '../engine/types';
import { ASPETTO_INIZIALE, Avatar, type Aspetto } from './Avatar';
import { bandiera } from './bandiere';
import { etichettaStagione } from './calendario';

/**
 * Il manifesto della carriera.
 *
 * Una carriera finita è una storia che vuoi far vedere a qualcuno. Un elenco di
 * numeri non si manda a nessuno; un manifesto sì — e se qualcuno lo guarda e chiede
 * «dove si gioca», il gioco si è raccontato da solo.
 *
 * È disegnato in HTML e si salva come immagine passando per una canvas: nessuna
 * libreria, nessun servizio, nessun dato che esce di qui.
 */
export function Poster({
  result,
  nome,
  nazionalita,
  look,
  numero,
  ambizioneId,
}: {
  result: CareerResult;
  nome: string;
  nazionalita: string;
  look?: Aspetto;
  numero?: string;
  ambizioneId?: string;
}) {
  const foglio = useRef<HTMLDivElement | null>(null);
  const [stato, setStato] = useState<'fermo' | 'lavoro' | 'fatto' | 'errore'>('fermo');

  const gol = result.seasons.reduce((somma, stagione) => somma + stagione.stats.goals, 0);
  const presenze = result.seasons.reduce((somma, stagione) => somma + stagione.stats.appearances, 0);
  const ambizione = ambizioneById(ambizioneId);
  const prima = result.seasons[0];
  const ultima = result.seasons[result.seasons.length - 1];
  const trofeiPerNome = new Map<string, number>();
  for (const trofeo of result.trophies) {
    trofeiPerNome.set(trofeo.competitionName, (trofeiPerNome.get(trofeo.competitionName) ?? 0) + 1);
  }

  /** Disegna il manifesto su una canvas e lo offre da salvare. */
  async function salva(): Promise<void> {
    const nodo = foglio.current;
    if (!nodo) return;
    setStato('lavoro');
    try {
      const larghezza = nodo.offsetWidth;
      const altezza = nodo.offsetHeight;
      const stile = [...document.styleSheets]
        .flatMap((foglio2) => {
          try {
            return [...foglio2.cssRules].map((regola) => regola.cssText);
          } catch {
            return [];
          }
        })
        .join('\n');

      const html = `<div xmlns="http://www.w3.org/1999/xhtml">${nodo.outerHTML}</div>`;
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${larghezza * 2}" height="${altezza * 2}" viewBox="0 0 ${larghezza} ${altezza}">` +
        `<foreignObject width="100%" height="100%"><style>${stile}</style>${html}</foreignObject></svg>`;

      const immagine = new Image();
      immagine.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await immagine.decode();

      const tela = document.createElement('canvas');
      tela.width = larghezza * 2;
      tela.height = altezza * 2;
      const pennello = tela.getContext('2d');
      if (!pennello) throw new Error('canvas non disponibile');
      pennello.fillStyle = '#08070a';
      pennello.fillRect(0, 0, tela.width, tela.height);
      pennello.drawImage(immagine, 0, 0);

      const link = document.createElement('a');
      link.download = `leggenda-${nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      link.href = tela.toDataURL('image/png');
      link.click();
      setStato('fatto');
    } catch {
      setStato('errore');
    }
  }

  return (
    <div className="card">
      <span className="contesto-etichetta">Il manifesto della carriera</span>

      <div className="poster" ref={foglio}>
        <div className="poster-alto">
          <span className="poster-marchio">LEGGENDA</span>
          <span className="poster-anni">
            {prima && ultima
              ? `${etichettaStagione(prima.age)} — ${etichettaStagione(ultima.age)}`
              : ''}
          </span>
        </div>

        <div className="poster-centro">
          <span className="poster-avatar" aria-hidden="true">
            <Avatar aspetto={look ?? ASPETTO_INIZIALE} numero={numero ?? ''} />
          </span>
          <div>
            <span className="poster-bandiera" aria-hidden="true">{bandiera(nazionalita)}</span>
            <h3 className="poster-nome">{nome}</h3>
            <p className="poster-club">{result.clubsPlayed.join(' · ')}</p>
          </div>
        </div>

        <div className="poster-punteggio">
          <b className="numero">{result.goat.total}</b>
          <span>punti GOAT</span>
        </div>

        <div className="poster-cifre">
          {([
            ['presenze', presenze],
            ['gol', gol],
            ['picco', result.peakOverall],
            ['trofei', result.trophies.length],
          ] as const).map(([nomeCifra, valore]) => (
            <span key={nomeCifra} className="poster-cifra">
              <b className="numero">{valore}</b>
              <span>{nomeCifra}</span>
            </span>
          ))}
        </div>

        {trofeiPerNome.size > 0 && (
          <p className="poster-trofei">
            {[...trofeiPerNome.entries()]
              .map(([nomeTrofeo, quante]) => (quante > 1 ? `${nomeTrofeo} ×${quante}` : nomeTrofeo))
              .join(' · ')}
          </p>
        )}

        {ambizione.id !== 'nessuna' && <p className="poster-ambizione">{ambizione.titolo}</p>}

        <span className="poster-basso">trovarts.github.io/legend</span>
      </div>

      <button type="button" className="bottone" style={{ marginTop: '.6rem' }} onClick={() => void salva()}>
        {stato === 'lavoro' ? 'Sto disegnando…' : stato === 'fatto' ? 'Salvato di nuovo' : 'Salva il manifesto'}
        <span className="posta">
          {stato === 'errore'
            ? 'Il browser non ha voluto: fai uno screenshot, viene uguale.'
            : 'Un’immagine da mandare a chi ti ha sfidato.'}
        </span>
      </button>
    </div>
  );
}
