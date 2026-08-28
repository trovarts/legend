'use client';

import { useEffect, useState } from 'react';
import { Modale } from './Modale';

const CHIAVE = 'leggenda:avviso-letto';

/**
 * L'avviso che si legge una volta sola.
 *
 * Il gioco usa nomi di club e calciatori veri per la simulazione. Dirlo prima che
 * qualcuno cominci a giocare è il minimo: costa una schermata e chiarisce cos'è
 * questo gioco e cosa non è.
 */
export function Avviso() {
  const [daMostrare, setDaMostrare] = useState(false);

  useEffect(() => {
    try {
      setDaMostrare(localStorage.getItem(CHIAVE) === null);
    } catch {
      // Finestra anonima: si mostra comunque, non è un danno.
      setDaMostrare(true);
    }
  }, []);

  if (!daMostrare) return null;

  return (
    <Modale
      occhiello="Avviso"
      titolo="Nessun collegamento ufficiale"
      azione="Ho capito"
      onAzione={() => {
        try {
          localStorage.setItem(CHIAVE, '1');
        } catch {
          // Se non si può ricordare, pazienza: si rilegge.
        }
        setDaMostrare(false);
      }}
    >
      <p>
        LEGGENDA è un gioco indipendente. Non è un prodotto ufficiale e non è affiliato,
        sponsorizzato né autorizzato da FIFA, EA Sports, UEFA, federazioni, leghe o club.
      </p>
      <p>
        Nomi di squadre e calciatori servono solo alla simulazione e non implicano licenza
        o approvazione di nessuno. I marchi restano dei rispettivi proprietari.
      </p>
      <p className="tenue">Continuando confermi di aver letto questo avviso.</p>
    </Modale>
  );
}
