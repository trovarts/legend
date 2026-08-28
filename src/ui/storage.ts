import type { CareerSave } from '../engine/play';
import { isSupportedSave } from '../engine/save';

const PREFIX = 'leggenda:save:';

export interface SlotSummary {
  id: string;
  name: string;
  seasons: number;
  updatedAt: number;
}

interface StoredSlot {
  save: CareerSave;
  seasons: number;
  updatedAt: number;
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
): void {
  const stored: StoredSlot = { save, seasons, updatedAt: now };
  storage.setItem(PREFIX + id, JSON.stringify(stored));
}

export function loadSlot(storage: Storage, id: string): CareerSave | null {
  return readSlot(storage, PREFIX + id)?.save ?? null;
}

export function deleteSlot(storage: Storage, id: string): void {
  storage.removeItem(PREFIX + id);
}
