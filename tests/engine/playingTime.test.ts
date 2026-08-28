import { describe, expect, it } from 'vitest';
import { playingTimeShare } from '../../src/engine/playingTime.js';
import type { Role, WorldPlayer } from '../../src/world/types.js';

function squadOf(role: Role, overalls: readonly number[]): WorldPlayer[] {
  return overalls.map((overall, index) => ({
    id: `p${index}`,
    name: `Giocatore ${index}`,
    age: 26,
    role,
    overall,
    potential: overall,
    valueEur: 1_000_000,
    nationality: 'Italy',
  }));
}

describe('playingTimeShare', () => {
  it('il migliore del reparto gioca quasi sempre', () => {
    const share = playingTimeShare({ overall: 85, age: 24, role: 'FWD' }, squadOf('FWD', [70, 72, 68]));
    expect(share).toBeGreaterThan(0.85);
  });

  it('il quinto attaccante di una big non gioca', () => {
    const share = playingTimeShare({ overall: 60, age: 24, role: 'FWD' }, squadOf('FWD', [88, 86, 84, 82, 80]));
    expect(share).toBeLessThan(0.15);
  });

  it('lo stesso giocatore gioca di più in una squadra debole', () => {
    const strong = playingTimeShare({ overall: 70, age: 24, role: 'MID' }, squadOf('MID', [85, 84, 83, 82, 80]));
    const weak = playingTimeShare({ overall: 70, age: 24, role: 'MID' }, squadOf('MID', [64, 62, 60, 58]));
    expect(weak).toBeGreaterThan(strong + 0.3);
  });

  it('conta solo i concorrenti dello stesso ruolo', () => {
    const mixed: WorldPlayer[] = [...squadOf('FWD', [90, 90, 90]), ...squadOf('GK', [60])];
    expect(playingTimeShare({ overall: 70, age: 24, role: 'GK' }, mixed)).toBeGreaterThan(0.85);
  });

  it("il secondo portiere gioca poco: davanti c'è un solo posto", () => {
    const share = playingTimeShare({ overall: 70, age: 24, role: 'GK' }, squadOf('GK', [80]));
    expect(share).toBeLessThan(0.4);
    expect(share).toBeGreaterThan(0.2);
  });

  it('resta sempre dentro i limiti', () => {
    const crowded = squadOf('DEF', [95, 94, 93, 92, 91, 90, 89, 88, 87, 86]);
    expect(playingTimeShare({ overall: 40, age: 24, role: 'DEF' }, crowded)).toBeGreaterThanOrEqual(0.02);
    expect(playingTimeShare({ overall: 99, age: 24, role: 'DEF' }, [])).toBeLessThanOrEqual(0.95);
  });

  it('senza concorrenti in rosa gioca al massimo', () => {
    expect(playingTimeShare({ overall: 50, age: 24, role: 'MID' }, [])).toBeGreaterThan(0.85);
  });
});
