import { describe, expect, it } from 'vitest';
import { simulateMatch, type MatchInput } from '../../src/engine/match';
import { createRng } from '../../src/engine/rng';

const base: MatchInput = {
  home: 'Atalanta', away: 'Napoli', homeStrength: 76, awayStrength: 78,
  playerAtHome: true, playerOverall: 74, playerRole: 'FWD', importance: 1,
};

function media(pick: (r: ReturnType<typeof simulateMatch>) => number): number {
  let total = 0;
  for (let seed = 0; seed < 300; seed += 1) total += pick(simulateMatch(base, createRng(seed)));
  return total / 300;
}

describe('simulateMatch', () => {
  it('produce un risultato con numeri da partita di calcio', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const match = simulateMatch(base, createRng(seed));
      expect(match.goals[0] + match.goals[1]).toBeLessThanOrEqual(9);
      expect(match.stats.possesso[0] + match.stats.possesso[1]).toBe(100);
      expect(match.stats.tiri[0] + match.stats.tiri[1]).toBeGreaterThanOrEqual(match.goals[0] + match.goals[1]);
    }
  });

  it('la media gol per partita è quella del calcio vero', () => {
    const gol = media((match) => match.goals[0] + match.goals[1]);
    expect(gol).toBeGreaterThan(1.5);
    expect(gol).toBeLessThan(4.5);
  });

  it('gli eventi sono in ordine di minuto e coprono tutta la partita', () => {
    const match = simulateMatch(base, createRng(3));
    const minuti = match.events.map((event) => event.minute);
    expect(minuti[0]).toBe(0);
    expect(minuti.at(-1)).toBe(90);
    expect([...minuti].sort((a, b) => a - b)).toEqual(minuti);
  });

  it('ogni gol nel tabellino ha il suo evento nel racconto', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const match = simulateMatch(base, createRng(seed));
      const raccontati = match.events.filter((e) => e.kind === 'gol' || e.kind === 'gol-subito').length;
      expect(raccontati).toBe(match.goals[0] + match.goals[1]);
    }
  });

  it('la squadra più forte vince più spesso', () => {
    let casa = 0;
    let ospite = 0;
    for (let seed = 0; seed < 400; seed += 1) {
      const match = simulateMatch({ ...base, homeStrength: 84, awayStrength: 66 }, createRng(seed));
      if (match.goals[0] > match.goals[1]) casa += 1;
      else if (match.goals[1] > match.goals[0]) ospite += 1;
    }
    expect(casa).toBeGreaterThan(ospite * 1.5);
  });

  it('un attaccante forte segna più di un difensore', () => {
    const attaccante = media((match) => match.playerGoals);
    let difensore = 0;
    for (let seed = 0; seed < 300; seed += 1) {
      difensore += simulateMatch({ ...base, playerRole: 'DEF' }, createRng(seed)).playerGoals;
    }
    expect(attaccante).toBeGreaterThan(difensore / 300);
  });

  it('il voto sta nella scala del calcio', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const match = simulateMatch(base, createRng(seed));
      expect(match.playerRating).toBeGreaterThanOrEqual(4);
      expect(match.playerRating).toBeLessThanOrEqual(10);
    }
  });

  it('è deterministica', () => {
    expect(simulateMatch(base, createRng(11))).toEqual(simulateMatch(base, createRng(11)));
  });
});
