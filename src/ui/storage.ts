import type { CareerSave } from '../engine/play';
import { isSupportedSave } from '../engine/save';

const PREFIX = 'leggenda:save:';

export interface SlotSummary {
  id: string;
  name: string;
  seasons: number;
  updatedAt: number;
  /** Dove e come sta andando: si legge nell'elenco senza aprire la carriera. */
  clubName?: string;
  age?: number;
  overall?: number;
  modo?: 'classica' | 'dettagliata';
}

interface StoredSlot {
  save: CareerSave;
  seasons: number;
  updatedAt: number;
  clubName?: string;
  age?: number;
  overall?: number;
}

function readSlot(storage: Storage, key: string): StoredSlot | null {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSlot>;
    if (!isSupportedSave(parsed.save)) return null;
    return {
      save: parsed.save,
      seasons: typeof parsed.seasons === 'number' ? parsed.seasons : 0,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      clubName: typeof parsed.clubName === 'string' ? parsed.clubName : undefined,
      age: typeof parsed.age === 'number' ? parsed.age : undefined,
      overall: typeof parsed.overall === 'number' ? parsed.overall : undefined,
    };
  } catch {
    // Uno slot illeggibile non deve impedire di vedere gli altri.
    return null;
  }
}

export function listSlots(storage: Storage): SlotSummary[] {
  const slots: SlotSummary[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key === null || !key.startsWith(PREFIX)) continue;
    const stored = readSlot(storage, key);
    if (!stored) continue;
    slots.push({
      id: key.slice(PREFIX.length),
      name: stored.save.create.name,
      seasons: stored.seasons,
      updatedAt: stored.updatedAt,
      clubName: stored.clubName,
      age: stored.age,
      overall: stored.overall,
      modo: stored.save.decisions.modo === 'classica' ? 'classica' : 'dettagliata',
    });
  }
  return slots.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveSlot(
  storage: Storage,
  id: string,
  save: CareerSave,
  seasons: number,
  now: number,
  /** A che punto è la carriera: serve solo a raccontarla nell'elenco. */
  stato?: { clubName?: string; age?: number; overall?: number },
): void {
  const stored: StoredSlot = { save, seasons, updatedAt: now, ...stato };
  storage.setItem(PREFIX + id, JSON.stringify(stored));
}

export function loadSlot(storage: Storage, id: string): CareerSave | null {
  return readSlot(storage, PREFIX + id)?.save ?? null;
}

export function deleteSlot(storage: Storage, id: string): void {
  storage.removeItem(PREFIX + id);
}
