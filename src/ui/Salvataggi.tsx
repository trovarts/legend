'use client';

import { useState } from 'react';
import type { CareerSave } from '../engine/play';
import { decodeSave } from '../engine/save';
import { deleteSlot, listSlots, loadSlot, type SlotSummary } from './storage';

export function Salvataggi({
  slots,
  onResume,
  onRefresh,
}: {
  slots: readonly SlotSummary[];
  onResume: (save: CareerSave, slotId: string) => void;
  onRefresh: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (slots.length === 0 && code === '') {
    return (
      <details className="card">
        <summary>Ho un codice carriera</summary>
        <CodeBox code={code} setCode={setCode} error={error} setError={setError} onResume={onResume} />
      </details>
    );
  }

  return (
    <div className="card">
      <h2>Riprendi una carriera</h2>
      {slots.map((slot) => (
        <div key={slot.id} className="riga">
          <button
            type="button"
            className="bottone"
            onClick={() => {
              const save = loadSlot(window.localStorage, slot.id);
              if (save) onResume(save, slot.id);
            }}
          >
            <strong>{slot.name}</strong>
            <span className="posta">{slot.seasons} stagioni giocate</span>
          </button>
          <button
            type="button"
            className="bottone"
            style={{ width: 'auto' }}
            aria-label={`Cancella la carriera di ${slot.name}`}
            onClick={() => {
              deleteSlot(window.localStorage, slot.id);
              onRefresh();
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <CodeBox code={code} setCode={setCode} error={error} setError={setError} onResume={onResume} />
    </div>
  );
}

function CodeBox({
  code,
  setCode,
  error,
  setError,
  onResume,
}: {
  code: string;
  setCode: (value: string) => void;
  error: string | null;
  setError: (value: string | null) => void;
  onResume: (save: CareerSave, slotId: string) => void;
}) {
  return (
    <div style={{ marginTop: '.8rem' }}>
      <label htmlFor="codice" className="tenue">Oppure incolla un codice carriera</label>
      <input
        id="codice"
        className="bottone"
        style={{ marginTop: '.4rem' }}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Codice ricevuto da un amico"
      />
      {code.trim() !== '' && (
        <button
          type="button"
          className="bottone bottone-forte"
          style={{ marginTop: '.5rem' }}
          onClick={() => {
            try {
              onResume(decodeSave(code), `condivisa-${Date.now()}`);
              setError(null);
            } catch (problem) {
              setError(problem instanceof Error ? problem.message : 'Codice non valido');
            }
          }}
        >
          Rivivi questa carriera
        </button>
      )}
      {error !== null && <p style={{ color: 'var(--allarme)' }}>{error}</p>}
    </div>
  );
}

export function refreshSlots(): SlotSummary[] {
  try {
    return listSlots(window.localStorage);
  } catch {
    return [];
  }
}
