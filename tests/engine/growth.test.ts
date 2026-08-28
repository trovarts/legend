import { describe, expect, it } from 'vitest';
import { growPlayer } from '../../src/engine/growth';
import { createRng } from '../../src/engine/rng';
import type { CareerPlayer } from '../../src/engine/types';

function playerAt(age: number, overall: number, potential: number): CareerPlayer {
  return {
    name: 'Test', nationality: 'Italy', role: 'MID', age, overall, potential,
    physique: 60, peakAge: 28, seasonsPlayed: age - 17, retired: false,
  };
}

describe('growPlayer', () => {
  it('fa invecchiare di un anno e conta la stagione', () => {
    const before = playerAt(18, 55, 85);
    const after = growPlayer(before, 0.8, createRng(1));
    expect(after.age).toBe(19);
    expect(after.seasonsPlayed).toBe(before.seasonsPlayed + 1);
  });

  it('non muta il giocatore che riceve', () => {
    const before = playerAt(18, 55, 85);
    growPlayer(before, 0.8, createRng(1));
    expect(before.age).toBe(18);
    expect(before.overall).toBe(55);
  });

  it('un giovane titolare cresce parecchio', () => {
    const after = growPlayer(playerAt(18, 55, 85), 0.9, createRng(3));
    expect(after.overall).toBeGreaterThan(58);
  });

  it('chi non gioca cresce molto meno, a parità di talento', () => {
    const playing = growPlayer(playerAt(18, 55, 85), 0.9, createRng(5));
    const benched = growPlayer(playerAt(18, 55, 85), 0.05, createRng(5));
    expect(playing.overall).toBeGreaterThan(benched.overall + 3);
  });

  it('a 33 anni si cala', () => {
    const after = growPlayer(playerAt(33, 80, 90), 0.7, createRng(9));
    expect(after.overall).toBeLessThan(80);
  });

  it('non supera mai il proprio potenziale', () => {
    let player = playerAt(18, 60, 72);
    for (let season = 0; season < 12; season += 1) {
      player = growPlayer(player, 0.9, createRng(season));
      expect(player.overall).toBeLessThanOrEqual(player.potential);
    }
  });

  it("l'overall resta fra 1 e 99 anche in una carriera lunghissima", () => {
    let player = playerAt(16, 46, 94);
    for (let season = 0; season < 25; season += 1) {
      player = growPlayer(player, season % 3 === 0 ? 0.05 : 0.85, createRng(season));
      expect(player.overall).toBeGreaterThanOrEqual(1);
      expect(player.overall).toBeLessThanOrEqual(99);
    }
  });

  it('è deterministico', () => {
    const a = growPlayer(playerAt(20, 60, 88), 0.7, createRng(42));
    const b = growPlayer(playerAt(20, 60, 88), 0.7, createRng(42));
    expect(a).toEqual(b);
  });
});
