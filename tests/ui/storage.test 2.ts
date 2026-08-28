import { beforeEach, describe, expect, it } from 'vitest';
import { deleteSlot, listSlots, loadSlot, saveSlot } from '../../src/ui/storage';
import { SAVE_VERSION } from '../../src/engine/save';
import type { CareerSave } from '../../src/engine/play';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

const save: CareerSave = {
  version: SAVE_VERSION, seed: 1,
  create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
  startClubId: 'c1',
  decisions: { training: {}, dilemmas: {}, transfers: {} },
};

describe('i salvataggi nel browser', () => {
  let storage: Storage;
  beforeEach(() => { storage = new MemoryStorage(); });

  it("all'inizio non ce n'è nessuno", () => {
    expect(listSlots(storage)).toEqual([]);
  });

  it('salva e rilegge', () => {
    saveSlot(storage, 'slot-1', save, 3, 1000);
    expect(loadSlot(storage, 'slot-1')).toEqual(save);
  });

  it('elenca i salvataggi dal più recente', () => {
    saveSlot(storage, 'a', save, 2, 1000);
    saveSlot(storage, 'b', { ...save, seed: 2 }, 9, 2000);
    const slots = listSlots(storage);
    expect(slots.map((slot) => slot.id)).toEqual(['b', 'a']);
    expect(slots[0]?.seasons).toBe(9);
    expect(slots[0]?.name).toBe('Diego');
  });

  it('sovrascrive lo stesso slot senza duplicarlo', () => {
    saveSlot(storage, 'a', save, 2, 1000);
    saveSlot(storage, 'a', save, 5, 2000);
    expect(listSlots(storage)).toHaveLength(1);
    expect(listSlots(storage)[0]?.seasons).toBe(5);
  });

  it('cancella', () => {
    saveSlot(storage, 'a', save, 2, 1000);
    deleteSlot(storage, 'a');
    expect(listSlots(storage)).toEqual([]);
    expect(loadSlot(storage, 'a')).toBeNull();
  });

  it('uno slot corrotto non fa crollare l\'elenco', () => {
    saveSlot(storage, 'a', save, 2, 1000);
    storage.setItem('leggenda:save:rotto', 'non-json');
    expect(() => listSlots(storage)).not.toThrow();
    expect(listSlots(storage)).toHaveLength(1);
  });

  it('un salvataggio di versione vecchia viene ignorato', () => {
    storage.setItem(
      'leggenda:save:antico',
      JSON.stringify({ save: { ...save, version: 0 }, seasons: 4, updatedAt: 1 }),
    );
    expect(listSlots(storage)).toHaveLength(0);
    expect(loadSlot(storage, 'antico')).toBeNull();
  });
});
