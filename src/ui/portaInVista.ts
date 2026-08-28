'use client';

import { useEffect, useRef } from 'react';

/**
 * Porta in vista la riga che riguarda te.
 *
 * In una classifica da venti squadre o in un tabellone di coppa, la riga che conta è
 * una sola e sta quasi sempre fuori schermo. Chiedere a chi gioca di cercarla ogni
 * volta è chiedergli di fare il lavoro dell'interfaccia.
 */
export function usaPortaInVista<T extends HTMLElement>(attivo = true) {
  const riferimento = useRef<T | null>(null);

  useEffect(() => {
    if (!attivo) return undefined;
    // Un attimo dopo l'entrata in scena, così l'animazione non se la porta dietro.
    const quando = setTimeout(() => {
      riferimento.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 420);
    return () => clearTimeout(quando);
  }, [attivo]);

  return riferimento;
}
