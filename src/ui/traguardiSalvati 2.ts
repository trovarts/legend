import type { CareerResult } from '../engine/types';
import { traguardiDi } from '../engine/traguardi';

const CHIAVE = 'leggenda:traguardi';

/** Gli id dei traguardi già sbloccati su questo dispositivo. */
export function leggiTraguardi(storage: Storage): string[] {
  try {
    const grezzo = storage.getItem(CHIAVE);
    if (grezzo === null) return [];
    const letto: unknown = JSON.parse(grezzo);
    return Array.isArray(letto) ? letto.filter((voce): voce is string => typeof voce === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Registra i traguardi di una carriera appena finita e restituisce quelli nuovi:
 * sono quelli da festeggiare, gli altri erano già in bacheca.
 */
export function registraTraguardi(storage: Storage, result: CareerResult): string[] {
  const gia = new Set(leggiTraguardi(storage));
  const nuovi = traguardiDi(result).filter((id) => !gia.has(id));
  if (nuovi.length === 0) return [];
  try {
    storage.setItem(CHIAVE, JSON.stringify([...gia, ...nuovi]));
  } catch {
    // Se lo spazio manca, il traguardo resta comunque mostrato una volta.
  }
  return nuovi;
}
