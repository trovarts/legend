import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng.js';
import { seasonStats, type SeasonStatsInput } from '../../src/engine/stats.js';

const starterForward: SeasonStatsInput = {
  overall: 78, role: 'FWD', minutesShare: 0.85, clubStrength: 76, leagueLevel: 1,
};

function averageOver(input: SeasonStatsInput, pick: (s: ReturnType<typeof seasonStats>) => number): number {
  let total = 0;
  for (let seed = 0; seed < 300; seed += 1) total += pick(seasonStats(input, createRng(seed)));
  return total / 300;
}

describe('seasonStats', () => {
  it('un attaccante titolare forte segna quanto un attaccante vero', () => {
    const goals = averageOver(starterForward, (s) => s.goals);
    expect(goals).toBeGreaterThan(9);
    expect(goals).toBeLessThan(22);
  });

  it('nessuna stagione assurda: mai più di 45 gol', () => {
    for (let seed = 0; seed < 2000; seed += 1) {
      const stats = seasonStats({ ...starterForward, overall: 94 }, createRng(seed));
      expect(stats.goals).toBeLessThanOrEqual(45);
    }
  });

  it('i portieri non segnano e i difensori quasi mai', () => {
    expect(averageOver({ ...starterForward, role: 'GK' }, (s) => s.goals)).toBe(0);
    const defenderGoals = averageOver({ ...starterForward, role: 'DEF' }, (s) => s.goals);
    expect(defenderGoals).toBeGreaterThan(0);
    expect(defenderGoals).toBeLessThan(6);
  });

  it('i centrocampisti fanno più assist che gol', () => {
    const goals = averageOver({ ...starterForward, role: 'MID' }, (s) => s.goals);
    const assists = averageOver({ ...starterForward, role: 'MID' }, (s) => s.assists);
    expect(assists).toBeGreaterThan(goals);
  });

  it('chi gioca poco produce poco', () => {
    const benched = averageOver({ ...starterForward, minutesShare: 0.08 }, (s) => s.goals);
    const starter = averageOver(starterForward, (s) => s.goals);
    expect(benched).toBeLessThan(starter / 3);
  });

  it('le presenze e i minuti sono coerenti fra loro', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const stats = seasonStats(starterForward, createRng(seed));
      expect(stats.minutes).toBeLessThanOrEqual(stats.appearances * 90);
      expect(stats.appearances).toBeLessThanOrEqual(38);
      if (stats.appearances === 0) expect(stats.minutes).toBe(0);
    }
  });

  it('i clean sheet arrivano solo a portieri e difensori, e dipendono dalla squadra', () => {
    expect(averageOver({ ...starterForward, role: 'FWD' }, (s) => s.cleanSheets)).toBe(0);
    const strongTeam = averageOver({ ...starterForward, role: 'GK', clubStrength: 84 }, (s) => s.cleanSheets);
    const weakTeam = averageOver({ ...starterForward, role: 'GK', clubStrength: 62 }, (s) => s.cleanSheets);
    expect(strongTeam).toBeGreaterThan(weakTeam + 2);
  });

  it('il voto medio resta nella scala del calcio', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const stats = seasonStats(starterForward, createRng(seed));
      expect(stats.rating).toBeGreaterThanOrEqual(5);
      expect(stats.rating).toBeLessThanOrEqual(9);
    }
  });

  it('un fuoriclasse ha un voto più alto di uno scarso', () => {
    const great = averageOver({ ...starterForward, overall: 90 }, (s) => s.rating);
    const poor = averageOver({ ...starterForward, overall: 58 }, (s) => s.rating);
    expect(great).toBeGreaterThan(poor + 0.4);
  });

  it('segnare in quarta divisione non è come segnare in Serie A', () => {
    const top = averageOver({ ...starterForward, leagueLevel: 1 }, (s) => s.goals);
    const bottom = averageOver({ ...starterForward, leagueLevel: 4 }, (s) => s.goals);
    expect(bottom).toBeGreaterThan(top);
  });

  it('è deterministico', () => {
    expect(seasonStats(starterForward, createRng(11))).toEqual(
      seasonStats(starterForward, createRng(11)),
    );
  });
});
