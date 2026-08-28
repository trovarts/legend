'use client';

import { useEffect, useState } from 'react';
import { TRAGUARDI } from '../engine/traguardi';
import { leggiTraguardi } from './traguardiSalvati';

/**
 * La bacheca dei traguardi, che vive più a lungo di una carriera sola.
 * Quelli ancora chiusi si vedono lo stesso: è il motivo per ricominciare.
 */
export function Traguardi({ evidenzia = [] }: { evidenzia?: readonly string[] }) {
  const [sbloccati, setSbloccati] = useState<readonly string[]>([]);

  useEffect(() => setSbloccati(leggiTraguardi(window.localStorage)), []);

  const presi = new Set([...sbloccati, ...evidenzia]);

  return (
    <section className="card">
      <span className="contesto-etichetta">
        Traguardi · {presi.size} su {TRAGUARDI.length}
      </span>
      <div className="traguardi">
        {TRAGUARDI.map((traguardo) => {
          const fatto = presi.has(traguardo.id);
          const appena = evidenzia.includes(traguardo.id);
          return (
            <div
              key={traguardo.id}
              className={`traguardo${fatto ? ' traguardo-preso' : ''}${appena ? ' traguardo-nuovo' : ''}`}
            >
              <span className="traguardo-segno" aria-hidden="true">{fatto ? '★' : '☆'}</span>
              <span>
                <b>{traguardo.title}</b>
                <span className="tenue" style={{ display: 'block', fontSize: '.8rem' }}>{traguardo.text}</span>
              </span>
              {appena && <span className="traguardo-badge">nuovo</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
