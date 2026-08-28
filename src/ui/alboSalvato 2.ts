import type { CareerResult } from '../engine/types';

/**
 * L'albo delle carriere chiuse su questo dispositivo.
 *
 * Una carriera finita sparisce, e con lei la voglia di ricominciare. L'albo la
 * trattiene: la prossima non parte da zero, parte da un numero da battere.
 */
export interface VoceAlbo {
  name: string;
  clubName: string;
  goat: number;
  seasons: number;
  peakOverall: number;
  /** Quando è stata chiusa, in millisecondi. */
  at: number;
}

const CHIAVE = 'leggenda:albo';
const QUANTE = 10;

export function leggiAlbo(storage: Storage): VoceAlbo[] {
  try {
    const grezzo = storage.getItem(CHIAVE);
    if (grezzo === null) return [];
    const letto: unknown = JSON.parse(grezzo);
    if (!Array.isArray(letto)) return [];
    return letto
      .filter((voce): voce is VoceAlbo =>
        typeof voce === 'object' && voce !== null && typeof (voce as VoceAlbo).goat === 'number')
      .sort((a, b) => b.goat - a.goat)
      .slice(0, QUANTE);
  } catch {
    return [];
  }
}

/**
 * Registra una carriera chiusa e dice in che posizione è entrata (1-based),
 * oppure null se non è entrata nell'albo o se c'era già.
 */
export function registraNellAlbo(storage: Storage, result: CareerResult, at: number): number | null {
  const voce: VoceAlbo = {
    name: result.player.name,
    clubName: result.clubsPlayed[result.clubsPlayed.length - 1] ?? '',
    goat: result.goat.total,
    seasons: result.seasons.length,
    peakOverall: result.peakOverall,
    at,
  };

  const gia = leggiAlbo(storage);
  // La stessa carriera riaperta non si conta due volte.
  if (gia.some((altra) => altra.goat === voce.goat && altra.name === voce.name && altra.seasons === voce.seasons)) {
    return null;
  }

  const aggiornato = [...gia, voce].sort((a, b) => b.goat - a.goat).slice(0, QUANTE);
  try {
    storage.setItem(CHIAVE, JSON.stringify(aggiornato));
  } catch {
    return null;
  }
  const posto = aggiornato.findIndex((altra) => altra.at === voce.at && altra.goat === voce.goat);
  return posto < 0 ? null : posto + 1;
}
