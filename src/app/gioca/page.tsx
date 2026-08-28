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
  const { leagues, loadLeagues, clubs } = world;
  const started = save !== null;

  useEffect(() => setSlots(refreshSlots()), []);

  // Il mercato ha senso solo se il mondo è abbastanza grande: appena la carriera
  // comincia carichiamo altri campionati, mentre l'utente legge la prima stagione.
  // Prima di tutto quelli del suo paese: riprendendo una carriera salvata, il club
  // di partenza sta lì, e senza non si può nemmeno ricostruirla.
  const nazionalita = save?.create.nationality;
  useEffect(() => {
    if (!started || leagues.length === 0) return;
    const suoi = leagues
      .filter((league) => league.country === nazionalita)
      .map((league) => league.id);
    const altri = leagues.slice(0, CAMPIONATI_DI_MERCATO).map((league) => league.id);
    void loadLeagues([...new Set([...suoi, ...altri])]);
  }, [started, leagues, loadLeagues, nazionalita]);

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
    /*
     * Anche la creazione è una scena: un passo per volta, la testata ferma e il corpo
     * che scorre da solo. Era l'ultimo posto in cui restava una pagina da scorrere.
     */
    <main className="gioco">
      {save === null ? (
        <div className="scena">
          <header className="scena-alto">
            <div className="scena-barra">
              <Link href="/" className="torna">← Menu di gioco</Link>
              <span className="tenue" style={{ fontSize: '.64rem' }}>Nessuna carriera aperta</span>
            </div>
          </header>
          <div className="scena-corpo">
            <Creazione world={world} onStart={start} />
            <Salvataggi slots={slots} onResume={resume} onRefresh={() => setSlots(refreshSlots())} />
          </div>
        </div>
      ) : world.clubs.every((entry) => entry.club.id !== save.startClubId) ? (
        <p className="tenue">Sto riaprendo la carriera…</p>
      ) : (
        <Carriera
          save={save}
          clubs={world.clubs}
          onChange={setSave}
          codice={encodeSave(save)}
          onEsci={() => {
            setSave(null);
            setSlotId(null);
            setSlots(refreshSlots());
          }}
        />
      )}
    </main>
  );
}
