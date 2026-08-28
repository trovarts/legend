'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { playCareer, type CareerSave } from '../../engine/play';
import { encodeSave } from '../../engine/save';
import { Carriera } from '../../ui/Carriera';
import { Creazione } from '../../ui/Creazione';
import { refreshSlots, Salvataggi } from '../../ui/Salvataggi';
import { saveSlot } from '../../ui/storage';
import type { SlotSummary } from '../../ui/storage';
import { useWorld } from '../../ui/useWorld';

const CAMPIONATI_DI_MERCATO = 12;

export default function Gioca() {
  const world = useWorld();
  const [save, setSave] = useState<CareerSave | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotSummary[]>([]);
  const [codeShown, setCodeShown] = useState(false);
  const { leagues, loadLeagues, clubs } = world;
  const started = save !== null;

  useEffect(() => setSlots(refreshSlots()), []);

  // Il mercato ha senso solo se il mondo è abbastanza grande: appena la carriera
  // comincia carichiamo altri campionati, mentre l'utente legge la prima stagione.
  useEffect(() => {
    if (!started || leagues.length === 0) return;
    void loadLeagues(leagues.slice(0, CAMPIONATI_DI_MERCATO).map((league) => league.id));
  }, [started, leagues, loadLeagues]);

  // Salvataggio automatico a ogni decisione: costa poche centinaia di byte.
  useEffect(() => {
    if (save === null || slotId === null || clubs.length === 0) return;
    try {
      const stato = playCareer(save, clubs);
      const ultima = stato.seasons[stato.seasons.length - 1];
      const vivaio = stato.youth[stato.youth.length - 1];
      saveSlot(window.localStorage, slotId, save, stato.seasons.length, Date.now(), {
        clubName: ultima?.clubName ?? vivaio?.clubName,
        age: ultima?.age ?? vivaio?.age,
        overall: ultima?.overallEnd ?? vivaio?.overallEnd,
      });
    } catch {
      // Spazio esaurito o finestra anonima: si gioca lo stesso, semplicemente non si salva.
    }
  }, [save, slotId, clubs]);

  const start = useCallback((created: CareerSave) => {
    setSave(created);
    setSlotId(`carriera-${created.seed}`);
  }, []);

  const resume = useCallback((loaded: CareerSave, id: string) => {
    setSave(loaded);
    setSlotId(id);
  }, []);

  return (
    <main>
      <div className="barra-alta">
        {save === null ? (
          <Link href="/" className="torna">← Menu di gioco</Link>
        ) : (
          <button
            type="button"
            className="torna"
            onClick={() => {
              setSave(null);
              setSlotId(null);
              setSlots(refreshSlots());
            }}
          >
            ← Menu di gioco
          </button>
        )}
        <span className="tenue" style={{ fontSize: '.68rem' }}>
          {save === null ? 'Nessuna carriera aperta' : 'Salvata da sola, a ogni scelta'}
        </span>
      </div>

      {save === null ? (
        <>
          <Creazione world={world} onStart={start} />
          <Salvataggi slots={slots} onResume={resume} onRefresh={() => setSlots(refreshSlots())} />
        </>
      ) : (
        <>
          <Carriera save={save} clubs={world.clubs} onChange={setSave} />
          <div className="card">
            <button type="button" className="bottone" onClick={() => setCodeShown(!codeShown)}>
              {codeShown ? 'Nascondi il codice' : 'Condividi questa carriera'}
              <span className="posta">
                Chi lo incolla rivive esattamente la tua carriera, decisione per decisione.
              </span>
            </button>
            {codeShown && (
              <textarea
                className="bottone"
                style={{ marginTop: '.6rem', minHeight: '5rem', fontFamily: 'ui-monospace, monospace', fontSize: '.8rem' }}
                readOnly
                value={encodeSave(save)}
                onFocus={(event) => event.target.select()}
              />
            )}
          </div>
        </>
      )}
    </main>
  );
}
