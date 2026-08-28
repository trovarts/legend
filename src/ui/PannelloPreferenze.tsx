'use client';

import { useEffect, useState } from 'react';
import { leggiModoPartita, MODI_PARTITA, scriviModoPartita, type ModoPartita } from './preferenze';

/** Come si guardano le partite: si sceglie una volta e vale per tutte. */
export function PannelloPreferenze() {
  const [modo, setModo] = useState<ModoPartita>('dettagliata');

  useEffect(() => setModo(leggiModoPartita()), []);

  return (
    <div style={{ marginTop: '.9rem', borderTop: '1px solid var(--bordo)', paddingTop: '.7rem' }}>
      <span className="contesto-etichetta">Come vedi le partite</span>
      <div className="riga" style={{ gap: '.4rem', marginTop: '.4rem' }}>
        {MODI_PARTITA.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bottone${modo === item.id ? ' bottone-scelto' : ''}`}
            onClick={() => {
              setModo(item.id);
              scriviModoPartita(item.id);
            }}
          >
            <b>{item.label}</b>
            <span className="posta">{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
