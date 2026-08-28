import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/engine/create.js';
import { boldPolicy } from '../../src/engine/dilemmas.js';
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

const home = club('home', 'Squadra di Casa', Array.from({ length: 22 }, () => 70));
const rival = club('rival', 'Rivale', Array.from({ length: 22 }, () => 74));

function input(over: Partial<SimulateSeasonInput> = {}): SimulateSeasonInput {
  return {
    season: 1,
    player: createPlayer(
      { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 20, leagueLevel: 1 },
      createRng(1),
    ),
    club: home,
    league: { id: 'lg', name: 'Lega', level: 1, clubCount: 20 },
    leagueStrengths: [78, 76, 74, 72, 70, 68, 66, 64],
    qualifiedToContinental: false,
    candidates: [{ club: rival, leagueId: 'lg', leagueName: 'Lega', leagueLevel: 1 }],
    alreadyCapped: false,
    marks: [],
    contractYearsLeft: 2,
    minutesBonus: 0,
    dilemmaPolicy: boldPolicy,
    ...over,
  };
}

describe('simulateSeason', () => {
  it('produce una riga di carriera completa', () => {
    const { record } = simulateSeason(input(), createRng(1));
    expect(record.season).toBe(1);
    expect(record.clubName).toBe('Squadra di Casa');
    expect(record.leagueName).toBe('Lega');
    expect(record.stats.appearances).toBeGreaterThanOrEqual(0);
    expect(record.position).toBeGreaterThanOrEqual(1);
    expect(record.valueEur).toBeGreaterThan(0);
    expect(Array.isArray(record.trophies)).toBe(true);
    expect(Array.isArray(record.offers)).toBe(true);
  });

  it('il giocatore restituito è invecchiato di un anno', () => {
    const source = input();
    const { grownPlayer } = simulateSeason(source, createRng(2));
    expect(grownPlayer.age).toBe(source.player.age + 1);
    expect(source.player.age).toBe(20);
  });

  it('chi arriva primo vince il campionato', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const { record } = simulateSeason(input(), createRng(seed));
      const wonLeague = record.trophies.some((trophy) => trophy.kind === 'league');
      expect(wonLeague).toBe(record.position === 1);
    }
  });

  it('arrivare nei primi quattro qualifica alla coppa continentale', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const outcome = simulateSeason(input(), createRng(seed));
      expect(outcome.qualifiedNextSeason).toBe(outcome.record.position <= 4);
    }
  });

  it('il valore di mercato riflette il giocatore a fine stagione', () => {
    const { record, grownPlayer } = simulateSeason(input(), createRng(3));
    expect(record.valueEur).toBeGreaterThan(0);
    expect(grownPlayer.overall).toBeGreaterThan(0);
  });

  it('è deterministico', () => {
    expect(simulateSeason(input(), createRng(9))).toEqual(simulateSeason(input(), createRng(9)));
  });
});
