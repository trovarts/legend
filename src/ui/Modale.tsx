'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Una schermata che si mette davanti a tutto.
 *
 * Serve per le cose che non si possono mancare: un avviso, un esito, una conferma.
 * Lo sfondo si sfoca, la pagina sotto non scorre più, e l'unica cosa a fuoco è quella
 * per cui il gioco si è fermato.
 */
export function Modale({
  titolo,
  occhiello,
  children,
  azione,
  onAzione,
  secondaria,
  onSecondaria,
  onChiudi,
}: {
  titolo: string;
  occhiello?: string;
  children: ReactNode;
  azione: string;
  onAzione: () => void;
  secondaria?: string;
  onSecondaria?: () => void;
  /** Se c'è, si può uscire col tasto Esc o toccando fuori. */
  onChiudi?: () => void;
}) {
  const primo = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    primo.current?.focus();
    const chiudi = onChiudi ?? onAzione;
    const tasto = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') chiudi();
    };
    document.addEventListener('keydown', tasto);
    // Mentre il pop-up è aperto la pagina sotto non si muove.
    const primaOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tasto);
      document.body.style.overflow = primaOverflow;
    };
  }, [onAzione, onChiudi]);

  return (
    <div
      className="velo"
      role="presentation"
      onClick={(evento) => {
        if (onChiudi && evento.target === evento.currentTarget) onChiudi();
      }}
    >
      <div className="modale" role="dialog" aria-modal="true" aria-label={titolo}>
        {occhiello !== undefined && <span className="contesto-etichetta">{occhiello}</span>}
        <h2 className="modale-titolo">{titolo}</h2>
        <div className="modale-corpo">{children}</div>
        <button ref={primo} type="button" className="avanti modale-azione" onClick={onAzione}>
          <span>{azione}</span>
          <span aria-hidden="true">→</span>
        </button>
        {secondaria !== undefined && onSecondaria && (
          <button type="button" className="bottone modale-secondaria" onClick={onSecondaria}>
            {secondaria}
          </button>
        )}
      </div>
    </div>
  );
}
