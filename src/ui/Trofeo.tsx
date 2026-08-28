'use client';

import { useEffect, useState } from 'react';

/**
 * Il momento in cui si alza la coppa. Dura pochi secondi e non serve a niente,
 * ed è esattamente per questo che serve: è il premio.
 */
export function Trofeo({
  nome,
  club,
  onEnd,
}: {
  nome: string;
  club: string;
  onEnd: () => void;
}) {
  const [entrato, setEntrato] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEntrato(true), 120);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={`celebrazione${entrato ? ' celebrazione-viva' : ''}`}>
      <div className="celebrazione-luce" aria-hidden="true" />
      <span className="celebrazione-coppa" aria-hidden="true">🏆</span>
      <h2 className="celebrazione-nome">{nome}</h2>
      <p className="celebrazione-club">{club}</p>
      <button type="button" className="avanti celebrazione-avanti" onClick={onEnd}>
        <span>Continua</span>
        <span className="scorciatoia"><b>Spazio</b> →</span>
      </button>
    </section>
  );
}
