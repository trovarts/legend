import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/engine/create.js';
import { boldPolicy } from '../../src/engine/dilemmas.js';
import { addMark } from '../../src/engine/marks.js';
import { createRng } from '../../src/engine/rng.js';
import { simulateSeason, type SimulateSeasonInput } from '../../src/engine/season.js';
import type { Club, Role, WorldPlayer } from '../../src/world/types.js';

function club(id: string, name: string, overalls: readonly number[]): Club {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `${id}p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id, name, squad };
}

/**
 * Rosa da 60: un giocatore creato in prima divisione (~55) qui gioca davvero.
 * Con una rosa da 70 la sua quota di minuti resterebbe incollata al minimo assoluto
 * e nessuno degli effetti che vogliamo misurare sarebbe visibile.
 */
const home = club('home', 'Squadra di Casa', Array.from({ length: 22 }, () => 60));

function input(over: Partial<SimulateSeasonInput> = {}): SimulateSeasonInput {
  return {
    season: 3,
    player: createPlayer(
      { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 24, leagueLevel: 1 },
      createRng(1),
    ),
    club: home,
    league: { id: 'lg', name: 'Lega', level: 1, clubCount: 20 },
    leagueStrengths: [78, 76, 74, 72, 70, 68, 66, 64],
    qualifiedToContinental: false,
    candidates: [],
    alreadyCapped: false,
    marks: [],
    contractYearsLeft: 2,
    minutesBonus: 0,
    dilemmaPolicy: boldPolicy,
    ...over,
  };
}

describe('la stagione con bivi e infortuni', () => {
  it('la riga di stagione riporta scelte, infortunio e Segni', () => {
    const { record } = simulateSeason(input(), createRng(1));
    expect(Array.isArray(record.choices)).toBe(true);
    expect(Array.isArray(record.marks)).toBe(true);
    expect(record.injury === null || typeof record.injury.matchesOut === 'number').toBe(true);
  });

  it('ogni scelta registra il bivio, la strada presa e come è andata', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const { record } = simulateSeason(input(), createRng(seed));
      for (const choice of record.choices) {
        expect(choice.dilemmaId.length).toBeGreaterThan(0);
        expect(choice.optionId.length).toBeGreaterThan(0);
        expect(choice.outcomeText.length).toBeGreaterThan(0);
        expect(choice.season).toBe(3);
      }
    }
  });

  it('un infortunio serio toglie minuti', () => {
    let hurtMinutes = 0; let healthyMinutes = 0; let hurtCount = 0; let healthyCount = 0;
    for (let seed = 0; seed < 300; seed += 1) {
      const { record } = simulateSeason(input(), createRng(seed));
      if (record.injury && record.injury.severity !== 'lieve') {
        hurtMinutes += record.stats.minutes; hurtCount += 1;
      } else if (!record.injury) {
        healthyMinutes += record.stats.minutes; healthyCount += 1;
      }
    }
    expect(hurtCount).toBeGreaterThan(0);
    expect(hurtMinutes / hurtCount).toBeLessThan(healthyMinutes / healthyCount);
  });

  it('litigare col mister toglie minuti già in questa stagione', () => {
    const angry = { ...input(), marks: addMark([], 'rissa-col-mister', 1, 1) };
    let withMark = 0; let without = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      withMark += simulateSeason(angry, createRng(seed)).record.minutesShare;
      without += simulateSeason(input(), createRng(seed)).record.minutesShare;
    }
    expect(withMark).toBeLessThan(without);
  });

  it('i Segni restituiti sono già invecchiati di una stagione', () => {
    // 'promessa-tradita' lo dà solo il bivio del rinnovo, che qui non può presentarsi
    // (contratto a due anni): così misuriamo l'invecchiamento e non un rinforzo.
    const withMark = { ...input(), marks: addMark([], 'promessa-tradita', 0.8, 1) };
    for (let seed = 0; seed < 50; seed += 1) {
      const { record } = simulateSeason(withMark, createRng(seed));
      const aged = record.marks.find((mark) => mark.id === 'promessa-tradita');
      expect(aged?.intensity).toBeLessThan(0.8);
    }
  });

  it('una scelta può rinforzare un Segno che si aveva già', () => {
    const withMark = { ...input(), marks: addMark([], 'uomo-spogliatoio', 0.5, 1) };
    let reinforced = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      const { record } = simulateSeason(withMark, createRng(seed));
      const mark = record.marks.find((item) => item.id === 'uomo-spogliatoio');
      if (mark && mark.intensity > 0.5) reinforced += 1;
    }
    expect(reinforced).toBeGreaterThan(0);
  });

  it('è deterministico anche con bivi e infortuni', () => {
    expect(simulateSeason(input(), createRng(9))).toEqual(simulateSeason(input(), createRng(9)));
  });
});
