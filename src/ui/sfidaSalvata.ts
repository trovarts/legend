/**
 * La striscia della sfida di oggi.
 *
 * La sfida da sola è una riga di testo; la striscia è il motivo per tornare domani.
 * Vive nel browser di chi gioca: non è un punteggio da confrontare con nessuno, è
 * un filo che si spezza se salti un giorno.
 */
export interface StatoSfida {
  /** L'ultimo giorno in cui la sfida è stata centrata, in formato AAAA-MM-GG. */
  ultimoGiorno: string;
  streak: number;
}

const CHIAVE = 'leggenda:sfida';

function giornoPrima(giorno: string): string {
  const [anno, mese, numero] = giorno.split('-').map(Number);
  if (anno === undefined || mese === undefined || numero === undefined) return '';
  const data = new Date(Date.UTC(anno, mese - 1, numero - 1));
  return data.toISOString().slice(0, 10);
}

export function leggiSfida(storage: Storage): StatoSfida {
  try {
    const grezzo = storage.getItem(CHIAVE);
    if (grezzo === null) return { ultimoGiorno: '', streak: 0 };
    const letto = JSON.parse(grezzo) as Partial<StatoSfida>;
    return {
      ultimoGiorno: typeof letto.ultimoGiorno === 'string' ? letto.ultimoGiorno : '',
      streak: typeof letto.streak === 'number' ? letto.streak : 0,
    };
  } catch {
    return { ultimoGiorno: '', streak: 0 };
  }
}

/** La striscia che vale oggi: se l'ultimo giorno centrato non è ieri né oggi, è finita. */
export function strisciaViva(stato: StatoSfida, oggi: string): number {
  if (stato.ultimoGiorno === oggi || stato.ultimoGiorno === giornoPrima(oggi)) return stato.streak;
  return 0;
}

/** Registra l'esito della sfida di oggi e restituisce la striscia aggiornata. */
export function registraSfida(storage: Storage, oggi: string, centrata: boolean): number {
  const stato = leggiSfida(storage);
  const viva = strisciaViva(stato, oggi);
  if (!centrata) return viva;
  if (stato.ultimoGiorno === oggi) return stato.streak;

  const aggiornato: StatoSfida = { ultimoGiorno: oggi, streak: viva + 1 };
  try {
    storage.setItem(CHIAVE, JSON.stringify(aggiornato));
  } catch {
    // Niente spazio: la sfida resta centrata, la striscia no.
  }
  return aggiornato.streak;
}
