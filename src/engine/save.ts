import type { CareerSave } from './play.js';

/** Sale a ogni modifica del motore che cambia l'esito di una simulazione (spec §5.4). */
export const SAVE_VERSION = 1;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const padded = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function isSupportedSave(value: unknown): value is CareerSave {
  if (typeof value !== 'object' || value === null) return false;
  const save = value as Partial<CareerSave>;
  return (
    save.version === SAVE_VERSION &&
    typeof save.seed === 'number' &&
    typeof save.startClubId === 'string' &&
    typeof save.create === 'object' && save.create !== null &&
    typeof save.decisions === 'object' && save.decisions !== null &&
    typeof save.decisions.training === 'object' &&
    typeof save.decisions.dilemmas === 'object' &&
    typeof save.decisions.transfers === 'object'
  );
}

export function encodeSave(save: CareerSave): string {
  return toBase64Url(JSON.stringify(save));
}

export function decodeSave(code: string): CareerSave {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(code.trim()));
  } catch {
    throw new Error('codice non valido: non è un salvataggio di LEGGENDA');
  }
  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
    const version = (parsed as { version: unknown }).version;
    if (version !== SAVE_VERSION) {
      throw new Error(`versione del salvataggio non supportata: ${String(version)}`);
    }
  }
  if (!isSupportedSave(parsed)) {
    throw new Error('codice non valido: non è un salvataggio di LEGGENDA');
  }
  return parsed;
}
