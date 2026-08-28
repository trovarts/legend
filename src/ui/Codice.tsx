'use client';

import { useState } from 'react';

/** Il codice della carriera: chi lo incolla rivive esattamente la stessa storia. */
export function Codice({ codice }: { codice: string }) {
  const [aperto, setAperto] = useState(false);

  return (
    <div className="card">
      <button type="button" className="bottone" onClick={() => setAperto(!aperto)}>
        {aperto ? 'Nascondi il codice' : 'Condividi questa carriera'}
        <span className="posta">
          Chi lo incolla rivive esattamente la tua carriera, decisione per decisione.
        </span>
      </button>
      {aperto && (
        <textarea
          className="bottone"
          style={{ marginTop: '.6rem', minHeight: '5rem', fontFamily: 'ui-monospace, monospace', fontSize: '.8rem' }}
          readOnly
          value={codice}
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}
