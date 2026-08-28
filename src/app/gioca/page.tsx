'use client';

import { useEffect, useState } from 'react';
import type { CareerSave } from '../../engine/play';
import { Carriera } from '../../ui/Carriera';
import { Creazione } from '../../ui/Creazione';
import { useWorld } from '../../ui/useWorld';

const CAMPIONATI_DI_MERCATO = 12;

export default function Gioca() {
  const world = useWorld();
  const [save, setSave] = useState<CareerSave | null>(null);
  const started = save !== null;
  const { leagues, loadLeagues } = world;

  // Il mercato ha senso solo se il mondo è abbastanza grande: appena la carriera
  // comincia carichiamo altri campionati, mentre l'utente legge la prima stagione.
  useEffect(() => {
    if (!started || leagues.length === 0) return;
    void loadLeagues(leagues.slice(0, CAMPIONATI_DI_MERCATO).map((league) => league.id));
  }, [started, leagues, loadLeagues]);

  return (
    <main>
      {save === null ? (
        <Creazione world={world} onStart={setSave} />
      ) : (
        <Carriera save={save} clubs={world.clubs} onChange={setSave} />
      )}
    </main>
  );
}
