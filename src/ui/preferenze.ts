/**
 * Le preferenze di chi guarda, non del giocatore.
 *
 * Non entrano nel salvataggio: una carriera condivisa deve dare la stessa carriera
 * a chiunque la apra, anche a chi le partite preferisce vederle in un altro modo.
 * Stanno nel browser di chi gioca e basta.
 */
export type ModoPartita = 'classica' | 'dettagliata';

const CHIAVE = 'leggenda:modo-partita';

export function leggiModoPartita(): ModoPartita {
  try {
    return localStorage.getItem(CHIAVE) === 'classica' ? 'classica' : 'dettagliata';
  } catch {
    return 'dettagliata';
  }
}

export function scriviModoPartita(modo: ModoPartita): void {
  try {
    localStorage.setItem(CHIAVE, modo);
  } catch {
    // Finestra anonima o storage negato: si gioca lo stesso, senza ricordarselo.
  }
}

export const MODI_PARTITA: readonly { id: ModoPartita; label: string; text: string }[] = [
  {
    id: 'dettagliata',
    label: 'Dettagliata',
    text: 'La partita scorre minuto per minuto: cronometro, episodi, statistiche che si muovono.',
  },
  {
    id: 'classica',
    label: 'Classica',
    text: 'Solo il risultato finale e il tabellino: si va avanti veloce.',
  },
];
