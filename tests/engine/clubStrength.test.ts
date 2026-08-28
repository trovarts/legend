import { describe, expect, it } from 'vitest';
import { clubStrength, clubStrengthWith, leaguePosition } from '../../src/engine/clubStrength.js';
import { createRng } from '../../src/engine/rng.js';
import type { Club, Role, WorldPlayer } from '../../src/world/types.js';

function club(overalls: readonly number[]): Club {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id: 'c1', name: 'Club', squad };
}

describe('clubStrength', () => {
  it('usa gli undici migliori, non tutta la rosa', () => {
    const eleven = Array.from({ length: 11 }, () => 80);
    const withBench = club([...eleven, 40, 40, 40, 40, 40]);
    expect(clubStrength(withBench)).toBe(80);
  });

  it('una rosa più corta di undici usa quello che ha', () => {
    expect(clubStrength(club([70, 70, 70]))).toBe(70);
  });

  it('una rosa vuota vale zero', () => {
    expect(clubStrength(club([]))).toBe(0);
  });
});

describe('clubStrengthWith', () => {
  it('un fuoriclasse titolare alza la squadra', () => {
    const base = club(Array.from({ length: 18 }, () => 70));
    const without = clubStrength(base);
    const withStar = clubStrengthWith(base, 92, 'FWD', 0.9);
    expect(withStar).toBeGreaterThan(without);
  });

  it('lo stesso fuoriclasse in panchina la alza molto meno', () => {
    const base = club(Array.from({ length: 18 }, () => 70));
    const starter = clubStrengthWith(base, 92, 'FWD', 0.9);
    const benched = clubStrengthWith(base, 92, 'FWD', 0.05);
    expect(starter).toBeGreaterThan(benched);
  });

  it('un giocatore scarso non abbassa la squadra se non gioca', () => {
    const base = club(Array.from({ length: 18 }, () => 80));
    const impact = Math.abs(clubStrengthWith(base, 45, 'FWD', 0.02) - clubStrength(base));
    expect(impact).toBeLessThan(0.2);
  });
});

describe('leaguePosition', () => {
  const strengths = [82, 80, 78, 76, 74, 72, 70, 68, 66, 64];

  it('la squadra più forte finisce spesso prima', () => {
    let sum = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      sum += leaguePosition(82, strengths, createRng(seed));
    }
    expect(sum / 200).toBeLessThan(3);
  });

  it('la squadra più debole finisce spesso ultima', () => {
    let sum = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      sum += leaguePosition(64, strengths, createRng(seed));
    }
    expect(sum / 200).toBeGreaterThan(7.5);
  });

  it('la posizione resta dentro il campionato', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const position = leaguePosition(70, strengths, createRng(seed));
      expect(position).toBeGreaterThanOrEqual(1);
      expect(position).toBeLessThanOrEqual(strengths.length);
      expect(Number.isInteger(position)).toBe(true);
    }
  });

  it('esiste la sorpresa: la più forte non vince sempre', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 200; seed += 1) {
      positions.add(leaguePosition(82, strengths, createRng(seed)));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('è deterministico', () => {
    expect(leaguePosition(74, strengths, createRng(9))).toBe(
      leaguePosition(74, strengths, createRng(9)),
    );
  });
});
