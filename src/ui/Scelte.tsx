'use client';

import type { ReactNode } from 'react';

/**
 * Le scelte del gioco: card grandi affiancate. In fondo a ognuna sta la puntata —
 * cosa può uscire e con che probabilità. È la forma che rende una decisione una scommessa.
 */
export function Scelte({ children }: { children: ReactNode }) {
  return <div className="scelte">{children}</div>;
}

export function Scelta({
  sigla,
  titolo,
  sottotitolo,
  nota,
  puntata,
  etichetta,
  sicura,
  onClick,
}: {
  sigla: string;
  titolo: string;
  sottotitolo?: string;
  nota: string;
  puntata: ReactNode;
  etichetta?: string;
  sicura?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="scelta entra" onClick={onClick}>
      <span className="scelta-stemma" aria-hidden="true">{sigla}</span>
      <span className="scelta-titolo">{titolo}</span>
      {sottotitolo !== undefined && <span className="scelta-sottotitolo">{sottotitolo}</span>}
      <span className="scelta-nota">{nota}</span>
      {etichetta !== undefined && (
        <span className={`scelta-rischio${sicura === true ? ' scelta-sicura' : ''}`}>{etichetta}</span>
      )}
      {puntata}
    </button>
  );
}

/** Due lettere dal nome: fa da stemma senza usare marchi di nessuno. */
export function sigla(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter((parte) => parte.length > 1);
  if (parole.length >= 2) return (parole[0]![0]! + parole[1]![0]!).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}
