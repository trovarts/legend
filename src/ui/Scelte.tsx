'use client';

import type { ReactNode } from 'react';

/**
 * Le scelte del gioco: card grandi affiancate, con lo stemma e in fondo il badge
 * di cosa ci si guadagna. È la forma che rende una decisione una decisione.
 */
export function Scelte({ children }: { children: ReactNode }) {
  return <div className="scelte">{children}</div>;
}

export function Scelta({
  sigla,
  titolo,
  nota,
  badge,
  rischio,
  onClick,
}: {
  sigla: string;
  titolo: string;
  nota: string;
  badge: string;
  rischio?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="scelta entra" onClick={onClick}>
      <span className="scelta-stemma" aria-hidden="true">{sigla}</span>
      <span className="scelta-titolo">{titolo}</span>
      <span className="scelta-nota">{nota}</span>
      <span className={`scelta-badge${rischio === true ? ' scelta-badge-rischio' : ''}`}>{badge}</span>
    </button>
  );
}

/** Due o tre lettere dal nome: fa da stemma senza usare marchi di nessuno. */
export function sigla(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter((parte) => parte.length > 1);
  if (parole.length >= 2) return (parole[0]![0]! + parole[1]![0]!).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}
